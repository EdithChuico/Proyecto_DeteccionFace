package com.proyecto.detector.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.proyecto.detector.model.Asistencia;
import com.proyecto.detector.model.Empleado;
import com.proyecto.detector.repository.AsistenciaRepository;
import com.proyecto.detector.repository.EmpleadoRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReporteService {

    @Autowired
    private AsistenciaRepository asistenciaRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private JavaMailSender mailSender;

    // Obtenemos tu correo desde application.properties
    @Value("${spring.mail.username}")
    private String correoRemitente;

    private static final Color COLOR_PRIMARIO = new Color(0, 51, 102);
    private static final Color COLOR_SECUNDARIO = new Color(240, 244, 248);

    @Async("iaTaskExecutor")
    public void generarYEnviarReportes(String empleadoId, int mes, int anio) {
        if ("TODOS".equalsIgnoreCase(empleadoId)) {
            List<Empleado> empleados = empleadoRepository.findAll();
            for (Empleado emp : empleados) {
                if (emp.getCorreo() != null && !emp.getCorreo().isEmpty()) {
                    procesarEnvioIndividual(emp, mes, anio);
                }
            }
        } else {
            Empleado emp = empleadoRepository.findById(empleadoId).orElse(null);
            if (emp != null && emp.getCorreo() != null) {
                procesarEnvioIndividual(emp, mes, anio);
            }
        }
    }

    private void procesarEnvioIndividual(Empleado empleado, int mes, int anio) {
        try {
            YearMonth yearMonth = YearMonth.of(anio, mes);
            LocalDateTime inicio = yearMonth.atDay(1).atStartOfDay();
            LocalDateTime fin = yearMonth.atEndOfMonth().atTime(23, 59, 59);

            List<Asistencia> asistencias = asistenciaRepository.findByEmpleadoIdAndFechaHoraBetween(empleado.getId(), inicio, fin);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            generarPdfElegante(out, empleado, asistencias, mes, anio);

            String contenidoHtml = construirPlantillaHtml(empleado, mes, anio);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // 1. CAMBIO DE REMITENTE (Tu correo de Gmail, pero muestra "Smart Assistance")
            helper.setFrom(correoRemitente, "Smart Assistance");
            helper.setTo(empleado.getCorreo());
            helper.setSubject("Estado de Cuenta Mensual: Asistencias " + mes + "/" + anio);

            helper.setText(contenidoHtml, true);

            // 2. INCRUSTAR LOGO EN EL HTML (Content-ID)
            ClassPathResource logoImagen = new ClassPathResource("static/Logo_Factura.jpg");
            helper.addInline("logoFactura", logoImagen);

            helper.addAttachment("Estado_Cuenta_" + empleado.getNombre().replace(" ", "_") + ".pdf", new ByteArrayResource(out.toByteArray()));

            mailSender.send(message);
            System.out.println("[Worker] Reporte enviado exitosamente a: " + empleado.getCorreo());

        } catch (Exception e) {
            System.err.println("[Worker] Error enviando reporte a " + empleado.getNombre() + ": " + e.getMessage());
        }
    }

    private void generarPdfElegante(ByteArrayOutputStream out, Empleado empleado, List<Asistencia> asistencias, int mes, int anio) throws Exception {
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        PdfWriter.getInstance(document, out);
        document.open();

        // COLORES CORPORATIVOS
        Color azulCorporativo = new Color(0, 51, 102);
        Color grisClaro = new Color(245, 245, 245);

        // 1. HEADER: Logo pequeño y Título alineado
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{1f, 3f});

        try {
            Image logo = Image.getInstance(new ClassPathResource("static/Logo_Factura.jpg").getURL());
            logo.scaleToFit(80, 80); // Logo más pequeño y discreto
            PdfPCell logoCell = new PdfPCell(logo);
            logoCell.setBorder(Rectangle.NO_BORDER);
            header.addCell(logoCell);
        } catch (Exception e) {
            header.addCell(new PdfPCell(new Phrase("LOGO")));
        }

        PdfPCell titleCell = new PdfPCell(new Phrase("DETALLE DE ASISTENCIAS Y MULTAS", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, azulCorporativo)));
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        titleCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        header.addCell(titleCell);
        document.add(header);

        document.add(Chunk.NEWLINE);

        // 2. DATOS DEL TRABAJADOR
        document.add(new Paragraph("Empleado: " + empleado.getNombre(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11)));
        document.add(new Paragraph("Período: " + mes + "/" + anio, FontFactory.getFont(FontFactory.HELVETICA, 10)));
        document.add(Chunk.NEWLINE);

        // 3. TABLA DE ASISTENCIAS (Diseño Azul Corporativo)
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2f, 1.5f, 2f, 1.5f});

        // Estilo de encabezados (Borde azul arriba y abajo)
        String[] cabeceras = {"Fecha y Hora", "Tipo", "Estado", "Monto"};
        for (String c : cabeceras) {
            PdfPCell cell = new PdfPCell(new Phrase(c, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
            cell.setBackgroundColor(azulCorporativo);
            cell.setBorder(Rectangle.TOP | Rectangle.BOTTOM);
            cell.setBorderColorTop(azulCorporativo);
            cell.setBorderColorBottom(azulCorporativo);
            cell.setPadding(8);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }

        double totalMultas = 0;
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        for (Asistencia a : asistencias) {
            PdfPCell cellFecha = new PdfPCell(new Phrase(a.getFechaHora().format(dtf), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            PdfPCell cellTipo = new PdfPCell(new Phrase("Marcaje", FontFactory.getFont(FontFactory.HELVETICA, 10)));
            PdfPCell cellEstado = new PdfPCell(new Phrase(a.getEstado(), FontFactory.getFont(FontFactory.HELVETICA, 10)));
            PdfPCell cellMulta = new PdfPCell(new Phrase(String.format("$%.2f", a.getMulta()), FontFactory.getFont(FontFactory.HELVETICA, 10)));

            // Borde gris claro solo abajo en filas
            for (PdfPCell cell : new PdfPCell[]{cellFecha, cellTipo, cellEstado, cellMulta}) {
                cell.setBorder(Rectangle.BOTTOM);
                cell.setBorderColorBottom(Color.LIGHT_GRAY);
                cell.setPadding(7);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }
            totalMultas += a.getMulta();
        }
        document.add(table);

        // 4. TOTAL (Resaltado)
        Paragraph total = new Paragraph("TOTAL A DESCONTAR: $" + String.format("%.2f", totalMultas),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, azulCorporativo));
        total.setAlignment(Element.ALIGN_RIGHT);
        total.setSpacingBefore(15);
        document.add(total);

        document.close();
    }

    private String construirPlantillaHtml(Empleado empleado, int mes, int anio) {
        return "<!DOCTYPE html>" +
                "<html lang='es'>" +
                "<head><meta charset='UTF-8'></head>" +
                "<body style='margin: 0; padding: 0; background-color: #f4f6f9; font-family: Arial, sans-serif;'>" +
                "  <table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0' style='padding: 20px 0;'>" +
                "    <tr>" +
                "      <td align='center'>" +
                "        <table role='presentation' width='600' cellspacing='0' cellpadding='0' border='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>" +
                "          " +
                "          <tr>" +
                "            <td style='background-color: #003366; padding: 30px; text-align: center;'>" +
                // ESTA LÍNEA LLAMA AL LOGO INCRUSTADO EN EL HELPER (cid:logoFactura)
                "              <img src='cid:logoFactura' alt='Smart Assistance Logo' width='180' style='display: block; margin: 0 auto; margin-bottom: 15px;' />" +
                "              <h1 style='color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;'>Smart Assistance</h1>" +
                "            </td>" +
                "          </tr>" +
                "          " +
                "          <tr>" +
                "            <td style='padding: 40px 30px;'>" +
                "              <h2 style='color: #1e293b; margin-top: 0; font-size: 20px;'>Estado de Cuenta Mensual</h2>" +
                "              <p style='color: #475569; font-size: 16px; line-height: 1.6;'>Estimado/a <strong>" + empleado.getNombre() + "</strong>,</p>" +
                "              <p style='color: #475569; font-size: 16px; line-height: 1.6;'>" +
                "                Adjunto a este correo encontrará su reporte consolidado de ingresos, asistencias y cálculo de penalidades correspondiente al período <strong>" + mes + "/" + anio + "</strong>." +
                "              </p>" +
                "              <div style='background-color: #f8fafc; border-left: 4px solid #003366; padding: 15px; margin: 25px 0;'>" +
                "                <p style='margin: 0; color: #334155; font-size: 14px;'>" +
                "                  <strong>Nota de seguridad:</strong> El archivo PDF adjunto contiene información confidencial de su registro laboral. Le sugerimos revisarlo y conservarlo para sus registros." +
                "                </p>" +
                "              </div>" +
                "              <p style='color: #475569; font-size: 15px; margin-bottom: 0;'>Atentamente,</p>" +
                "              <p style='color: #003366; font-size: 16px; font-weight: bold; margin-top: 5px;'>Departamento de Recursos Humanos</p>" +
                "            </td>" +
                "          </tr>" +
                "          " +
                "          <tr>" +
                "            <td style='background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;'>" +
                "              <p style='color: #64748b; font-size: 12px; margin: 0;'>" +
                "                Este es un correo generado automáticamente por la plataforma Smart Assistance." +
                "              </p>" +
                "            </td>" +
                "          </tr>" +
                "        </table>" +
                "      </td>" +
                "    </tr>" +
                "  </table>" +
                "</body>" +
                "</html>";
    }
}
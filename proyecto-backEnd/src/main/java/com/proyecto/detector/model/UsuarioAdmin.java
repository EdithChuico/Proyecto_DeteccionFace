package com.proyecto.detector.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuarios_admin")
public class UsuarioAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String correo;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "mfa_habilitado")
    private Boolean mfaHabilitado = false;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    @Column(name = "otp_temporal")
    private String otpTemporal;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiration")
    private java.time.LocalDateTime resetTokenExpiration;

    public UsuarioAdmin() {}
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public java.time.LocalDateTime getResetTokenExpiration() { return resetTokenExpiration; }
    public void setResetTokenExpiration(java.time.LocalDateTime resetTokenExpiration) { this.resetTokenExpiration = resetTokenExpiration; }

    public boolean isMfaHabilitado() {
        return mfaHabilitado != null && mfaHabilitado;
    }

    public void setMfaHabilitado(Boolean mfaHabilitado) {
        this.mfaHabilitado = mfaHabilitado;
    }
    public String getMfaSecret() {
        return mfaSecret;
    }
    public void setMfaSecret(String mfaSecret) { this.mfaSecret = mfaSecret; }

    public String getOtpTemporal() { return otpTemporal; }
    public void setOtpTemporal(String otpTemporal) { this.otpTemporal = otpTemporal; }
}
from flask import Flask, request, jsonify
from deepface import DeepFace
import base64
import cv2
import numpy as np

app = Flask(__name__)
def decodificar_imagen(base64_str):
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]
    img_data = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

@app.route('/api/ia/verificar', methods=['POST'])
def verificar_rostro():
    try:
        data = request.json
        foto_empleado_live = data.get('fotoActual')
        fotos_dataset = data.get('fotosBaseDatos') # Recibirá la lista de 3 fotos de PocketBase

        if not foto_empleado_live or not fotos_dataset:
            return jsonify({"error": "Faltan imágenes para comparar"}), 400

        img_live = decodificar_imagen(foto_empleado_live)
        for foto_db_base64 in fotos_dataset:
            img_db = decodificar_imagen(foto_db_base64)
            
            try:
                resultado = DeepFace.verify(img_live, img_db, model_name="Facenet512", enforce_detection=False)
                
                if resultado['verified']:
                    return jsonify({
                        "reconocido": True, 
                        "distancia": resultado['distance'],
                        "mensaje": "Identidad confirmada"
                    }), 200
            except Exception as e:
                print("Error en iteración de DeepFace:", str(e))
                continue # Si falla una foto, intenta con la siguiente

        return jsonify({"reconocido": False, "mensaje": "Rostro no coincide con el dataset"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
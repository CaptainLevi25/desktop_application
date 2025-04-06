from flask import Flask, request, jsonify, render_template
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
import tensorflow as tf
import numpy as np
from PIL import Image
from flask_cors import CORS
import io
import cv2
import gdown


# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Model setup
MODEL_PATH = "best_model_2.keras"
DRIVE_FILE_ID = "14i3LvHBOZJGNceQ-FJ7V-QK_aQiATO2q"  # 👈 Replace this with your file ID

def download_model():
    if not os.path.exists("models"):
        os.makedirs("models")
    if not os.path.exists(MODEL_PATH):
        print("Downloading model from Google Drive...")
        url = f"https://drive.google.com/uc?id={DRIVE_FILE_ID}"
        gdown.download(url, MODEL_PATH, quiet=False)

# Download and load the trained Keras model for skin cancer classification


model = tf.keras.models.load_model(MODEL_PATH)

# Define class labels for skin cancer classification
class_labels = ["0", "1", "2", "3", "4", "5", "6"]

# Define target size for preprocessing
target_size = (112, 112)

# Mapping class indices to disease names
classes = {
    0: 'actinic keratoses and intraepithelial carcinomae (Cancer)',
    1: 'basal cell carcinoma (Cancer)',
    2: 'benign keratosis-like lesions (Non-Cancerous)',
    3: 'dermatofibroma (Non-Cancerous)',
    4: 'melanocytic nevi (Non-Cancerous)',
    5: 'pyogenic granulomas and hemorrhage (Can lead to cancer)',
    6: 'melanoma (Cancer)'
}

def preprocess_image(img):
    """Ensures image is in RGB format and resizes to (112, 112, 3) while maintaining aspect ratio."""
    if isinstance(img, Image.Image):
        img = img.convert("RGB")  # Convert to RGB to ensure 3 channels
        img = np.array(img)  # Convert PIL Image to NumPy array

    if img.shape[-1] == 4:  # If RGBA, convert to RGB
        img = img[:, :, :3]

    old_size = img.shape[:2]  # (height, width)
    ratio = min(float(target_size[0]) / old_size[0], float(target_size[1]) / old_size[1])
    new_size = tuple([int(x * ratio) for x in old_size])

    img = cv2.resize(img, (new_size[1], new_size[0]))

    delta_w = target_size[1] - new_size[1]
    delta_h = target_size[0] - new_size[0]
    top, bottom = delta_h // 2, delta_h - (delta_h // 2)
    left, right = delta_w // 2, delta_w - (delta_w // 2)

    color = [0, 0, 0]  # Black padding
    new_im = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)

    # Convert to float32 and normalize
    new_im = new_im.astype("float32") / 255.0

    return new_im

def detect_skin(image_np):
    print('here')
    """Detects if skin is present in the image using OpenCV."""
    image_hsv = cv2.cvtColor(image_np, cv2.COLOR_RGB2HSV)  # Convert to HSV

    # Define skin color range in HSV
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([20, 255, 255], dtype=np.uint8)

    # Create mask for skin regions
    skin_mask = cv2.inRange(image_hsv, lower_skin, upper_skin)

    # Count nonzero pixels in the mask (i.e., potential skin regions)
    skin_ratio = np.count_nonzero(skin_mask) / skin_mask.size

    # If skin pixels make up more than a threshold (e.g., 5% of image), assume skin is present
    return skin_ratio > 0.05


@app.route("/")
def home():
    return render_template("homepage.html")


@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    image_pil = Image.open(io.BytesIO(file.read())).convert("RGB")  # Ensure RGB conversion
    image_np = np.array(image_pil)

    if detect_skin(image_np):
        print('Skin detected, processing...')
        processed_image = preprocess_image(image_pil)  # Preprocess
        processed_image = np.expand_dims(processed_image, axis=0)
        prediction = model.predict(processed_image)  # Get prediction
        print(prediction)
        predicted_class = class_labels[np.argmax(prediction)]  # Get highest probability class
        predicted_class = int(predicted_class)
        response = jsonify({"prediction": classes[predicted_class]})
    else:
        print('No skin detected.')
        response = jsonify({"prediction": "Skin not detected in the image. Please upload an image containing skin."})

    response.headers.add("Access-Control-Allow-Origin", "*")
    return response

if __name__ == "__main__":
    app.run(debug=True)

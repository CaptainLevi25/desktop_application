const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const camInput = document.getElementById("camInput");
const imageContainer = document.getElementById("imageContainer");
const previewImage = document.getElementById("previewImage");
const predictBtn = document.getElementById("predictBtn");
const banner = document.getElementById("banner");
const bannerText = document.getElementById("bannerText");
const resultContainer = document.getElementById("resultContainer");
const resultText = document.getElementById("resultText");

const webcam = document.getElementById("webcam");
const webcamCanvas = document.getElementById("webcamCanvas");





function getTranslationValues(element) {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return { translateX: matrix.m41, translateY: matrix.m42 };
}

function translateElement(element, deltaX, deltaY) {
  const { translateX, translateY } = getTranslationValues(element);
  element.style.transform = `translate(${translateX + deltaX}px, ${translateY + deltaY}px)`;
}

function isTranslated(element) {
  const style = window.getComputedStyle(element);
  return style.transform !== "none";
}

// Drag & Drop Effects
dropArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropArea.classList.add("dragover");
});
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("dragover");
});
dropArea.addEventListener("drop", (event) => {
  event.preventDefault();
  dropArea.classList.remove("dragover");
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

// Drop area click: Ask for Camera or File Input
camInput.addEventListener("click", (event) => {
   event.stopPropagation();
   openWebcam();
  
});

// File input listener
fileInput.addEventListener("change", (event) => {
  // if (isCameraActive) return; // do nothing if camera is open
  if (event.target.files.length > 0) {
    handleFile(event.target.files[0]);
  }
});

// Handle uploaded/captured file
function handleFile(file) {
  imageContainer.style.transform = "none";
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImage.src = e.target.result;
      imageContainer.style.display = "block";
      setTimeout(() => {
        imageContainer.style.opacity = "1";
        predictBtn.classList.add("show");
        if (isTranslated(dropArea)) translateElement(predictBtn, 0, 90);
      }, 200);
    };
    reader.readAsDataURL(file);
  }
}

// Predict Handler
predictBtn.addEventListener("click", async () => {
  if (!previewImage.src) {
    alert("Please upload an image first!");
    return;
  }

  predictBtn.classList.add("loading");
  predictBtn.innerHTML = "";
  predictBtn.disabled = true;

  setTimeout(async () => {
    try {
      const response = await fakeApiCall();
      if (Array.isArray(response)) {
        resultText.innerHTML = `
          <h3 style="margin-bottom: 10px;">${response[0]}</h3>
          <ul style="padding-left: 20px;">
            ${response[1].map(item => `<li>${item}</li>`).join('')}</ul>`;
      } else if (typeof response === "object" && response.prediction && response.suggestions) {
        resultText.innerHTML = `
          <h3 style="margin-bottom: 10px;">${response.prediction}</h3>
          <ul style="padding-left: 20px;">
            ${response.suggestions.map(item => `<li>${item}</li>`).join('')}</ul>`;
      } else {
        resultText.innerHTML = response;
      }

      banner.style.transform = "translate(0px , -220px)";
      banner.style.fontSize = "18px";
      banner.style.width = "990px";
      bannerText.innerHTML = "Your AI-Powered Personalized Skin Cancer Detector";

      imageContainer.style.zIndex = "1";
      imageContainer.style.transform = "translate(850px, -230px) scale(0.5)";
      dropArea.style.transform = "translateX(-700px)";
      predictBtn.style.transform = "translateX(-700px)";

      resultContainer.style.display = "block";
      setTimeout(() => resultContainer.style.opacity = "1", 300);
    } catch (error) {
      alert("Error fetching result. Try again.");
    } finally {
      predictBtn.classList.remove("loading");
      predictBtn.innerHTML = "Predict";
      predictBtn.disabled = false;
    }
  }, 300);
});

// Fake API call (calls your server)
async function fakeApiCall() {
  const file = fileInput.files[0];
  
  try {
    return await callApi(file);
  } catch (e) {
    console.log(e);
  }
}

async function callApi(file) {
  const formData = new FormData();
  formData.append("file", file);
  console.log(formData)
  try {
    const response = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    return data.prediction;
  } catch (error) {
    return "Error: Unable to fetch results.";
  }
}

// Webcam Capture Logic
function openWebcam() {
  const webcamWrapper = document.getElementById("webcamWrapper");
  const captureBtn = document.getElementById("captureBtn");

 

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      webcam.srcObject = stream;
      webcamWrapper.style.display = "block";
    })
    .catch(err => {
      alert("Camera access denied or not supported.");
      console.error(err);
    });

  captureBtn.onclick = () => {
    const ctx = webcamCanvas.getContext("2d");
    webcamCanvas.width = webcam.videoWidth;
    webcamCanvas.height = webcam.videoHeight;
    ctx.drawImage(webcam, 0, 0, webcamCanvas.width, webcamCanvas.height);

    const stream = webcam.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());

    webcamWrapper.style.display = "none";
 

    webcamCanvas.toBlob((blob) => {
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      handleFile(file);

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    }, "image/jpeg");
  };
}

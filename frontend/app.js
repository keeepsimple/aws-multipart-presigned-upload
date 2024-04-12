const baseUrl = "http://localhost:4000";
const CHUNK_SIZE = 100 * 1024 * 1024; // 5MB chunk size
const fileInput = document.querySelector("#fileInput");
const uploadBtn = document.querySelector("#uploadBtn");
const progressBar = document.querySelector(".progress-bar");
let file, fileName, totalChunks, uploadId;

// Listen for file input change event
fileInput.addEventListener("change", () => {
  file = fileInput.files[0];
  fileName = Date.now().toString() + "_" + file.name;
  totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  console.log("file ", file, "totalChunks ", totalChunks);
  console.log("fileName ", fileName);
});

// Listen for upload button click event
uploadBtn.addEventListener("click", async () => {
  if (!file) {
    return alert("Please select a file");
  }

  uploadBtn.disabled = true;

  try {
    // Start the timer
    const startTime = new Date();

    // Initiate multipart upload
    const requestBody = { fileName };
    console.log("requestBody ", requestBody);
    const res = await fetch(`${baseUrl}/api/upload/init-upload`, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const response = await res.json();
    console.log(response);
    uploadId = response.data;
    // Send file chunks
    const uploadPromises = [];
    let uploadedChunks = 0;
    let start = 0,
      end;
    for (let i = 0; i < totalChunks; i++) {
      end = start + CHUNK_SIZE;
      const chunk = file.slice(start, end);
      const requestParams = {
        uploadId,
        partNumber: i,
        fileName,
      };
      const urlPromise = fetch(`${baseUrl}/api/upload/url-upload-part`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestParams),
      }).then(async (res) => {
        const jspo = await res.json();
        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("fileName", fileName);

        const uploadPromise = await fetch(jspo.data, {
          method: "PUT",
          body: chunk,
        });

        uploadedChunks++;
        const progress = Math.floor((uploadedChunks / totalChunks) * 100);
        updateProgressBar(progress);
      });
      uploadPromises.push(urlPromise);
      start = end;
    }

    await Promise.all(uploadPromises);

    const requestComplete = {
      fileName: fileName,
      uploadId: uploadId,
    };
    // Complete multipart upload
    const completeRes = await fetch(`${baseUrl}/api/upload/complete-upload`, {
      method: "POST",
      body: JSON.stringify(requestComplete),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const { success, data } = await completeRes.json();
    console.log("file link: ", data);
    if (!success) {
      throw new Error("Error completing upload");
    }

    // End the timer and calculate the time elapsed
    const endTime = new Date();
    const timeElapsed = (endTime - startTime) / 1000;
    console.log("Time elapsed:", timeElapsed, "seconds");
    alert("File uploaded successfully");
    resetProgressBar();
  } catch (err) {
    console.log(err);
    alert("Error uploading file");
  }

  uploadBtn.disabled = false;
});

// update progress bar
function updateProgressBar(progress) {
  progressBar.style.width = progress + "%";
  progressBar.textContent = progress + "%";
  console.log("progress ", progress);
}

// Reset progress bar and file input
function resetProgressBar() {
  progressBar.style.width = "0%";
  progressBar.textContent = "";
  fileInput.value = "";
}

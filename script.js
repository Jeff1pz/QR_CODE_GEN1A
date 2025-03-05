document.addEventListener("DOMContentLoaded", loadExistingFiles);
document.getElementById("uploadForm").addEventListener("submit", uploadFiles);

async function uploadFiles(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById("fileInput");
    const expirySelect = document.getElementById("expirySelect");
    const formData = new FormData();

    for (let file of fileInput.files) {
        formData.append("files", file);
    }
    formData.append("expiry", expirySelect.value); // Send expiry time to server

    document.getElementById("loadingContainer").style.display = "block";

    try {
        const response = await fetch("/upload", { method: "POST", body: formData });
        const data = await response.json();
        document.getElementById("loadingContainer").style.display = "none";

        if (!data.uploads || data.uploads.length === 0) {
            alert("Upload failed!");
            return;
        }

        // Append new files instead of replacing the existing ones
        data.uploads.forEach(addFileToDisplay);
    } catch (error) {
        console.error("Upload error:", error);
    }
}

async function loadExistingFiles() {
    try {
        const response = await fetch("/uploads");
        const data = await response.json();

        const filesContainer = document.getElementById("filesContainer");
        filesContainer.innerHTML = ""; // **Clear previous content**

        if (data.uploads.length > 0) {
            data.uploads.forEach(addFileToDisplay);
        }
    } catch (error) {
        console.error("Error loading files:", error);
    }
}


// Function to add a single file to the display without clearing previous ones
function addFileToDisplay(file) {
    const filesContainer = document.getElementById("filesContainer");

    const fileBox = document.createElement("div");
    fileBox.className = "file-box";
    fileBox.innerHTML = `
        <h3>${file.fileName}</h3>
        <img src="${file.qrCode}" alt="QR Code">
        <p><a href="${file.url}" target="_blank">Download Link</a></p>
        <p id="countdown-${file.fileName}" class="countdown-text"></p>
        <button class="delete-btn" onclick="deleteFile('${file.fileName.split('.')[0]}', event)">Delete</button>
    `;
    filesContainer.appendChild(fileBox);
    startCountdown(file.expiresAt, `countdown-${file.fileName}`);
}

// Countdown function with dynamic color changes
function startCountdown(expiry, id) {
    function updateCountdown() {
        const now = Date.now();
        const timeLeft = expiry - now;
        const countdownElement = document.getElementById(id);

        if (!countdownElement) return;

        if (timeLeft <= 0) {
            countdownElement.innerText = "Expired!";
            countdownElement.style.color = getComputedStyle(document.body).getPropertyValue("--countdown-gray");
        } else {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            let displayText = "";
            if (days > 0) displayText += `${days}d `;
            displayText += `${hours}h ${minutes}m ${seconds}s`;

            countdownElement.innerText = `Expires in: ${displayText}`;

            // Apply dynamic colors
            if (timeLeft <= 60 * 60 * 1000) {
                countdownElement.style.color = getComputedStyle(document.body).getPropertyValue("--countdown-red"); // 🔴 <1 Hour
            } else if (timeLeft <= 6 * 60 * 60 * 1000) {
                countdownElement.style.color = getComputedStyle(document.body).getPropertyValue("--countdown-orange"); // 🟠 <6 Hours
            } else if (timeLeft <= 24 * 60 * 60 * 1000) {
                countdownElement.style.color = getComputedStyle(document.body).getPropertyValue("--countdown-yellow"); // 🟡 <24 Hours
            } else {
                countdownElement.style.color = getComputedStyle(document.body).getPropertyValue("--countdown-green"); // 🟢 More than 1 day
            }
        }
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

let fileToDelete = null; // Store the file to delete

async function deleteFile(publicId, event) {
    event.stopPropagation();
    event.preventDefault();

    fileToDelete = publicId;
    document.getElementById("deletePopup").style.display = "flex";
}

// Handle Confirm Delete
document.getElementById("confirmDelete").addEventListener("click", async (event) => {
    event.stopPropagation();
    event.preventDefault();

    if (!fileToDelete) return;

    try {
        const response = await fetch(`/delete/${fileToDelete}`, { method: "DELETE" });
        const data = await response.json();

        if (data.success) {
            alert("File deleted successfully!");

            // **Clear and Reload the List**
            document.getElementById("filesContainer").innerHTML = "";
            loadExistingFiles(); 
        } else {
            alert("File deletion failed!");
        }
    } catch (error) {
        console.error("Delete error:", error);
    }

    fileToDelete = null;
    document.getElementById("deletePopup").style.display = "none";
});

// Handle Cancel Delete
document.getElementById("cancelDelete").addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();

    fileToDelete = null;
    document.getElementById("deletePopup").style.display = "none";
});

// Dark Mode Toggle
document.addEventListener("DOMContentLoaded", () => {
    // Check local storage for dark mode preference
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
        document.getElementById("darkModeToggle").textContent = "☀️ Light Mode";
    }

    document.getElementById("darkModeToggle").addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");

        // Update local storage
        if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("darkMode", "enabled");
            document.getElementById("darkModeToggle").textContent = "☀️ Light Mode";
        } else {
            localStorage.setItem("darkMode", "disabled");
            document.getElementById("darkModeToggle").textContent = "🌙 Dark Mode";
        }

        // Update countdown colors when dark mode changes
        document.querySelectorAll(".countdown-text").forEach(el => {
            el.style.color = getComputedStyle(document.body).getPropertyValue(el.style.color);
        });
    });
});

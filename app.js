const STORAGE_KEY = "photoDiary_v1";
const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.72;

const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-indexed
  selectedDate: null, // "YYYY-MM-DD"
};

const el = {
  monthLabel: document.getElementById("monthLabel"),
  grid: document.getElementById("calendarGrid"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  modal: document.getElementById("dayModal"),
  modalDateLabel: document.getElementById("modalDateLabel"),
  closeModal: document.getElementById("closeModal"),
  photoPreview: document.getElementById("photoPreview"),
  photoPlaceholder: document.getElementById("photoPlaceholder"),
  photoImg: document.getElementById("photoImg"),
  cameraInput: document.getElementById("cameraInput"),
  takePhotoBtn: document.getElementById("takePhotoBtn"),
  deletePhotoBtn: document.getElementById("deletePhotoBtn"),
};

function loadPhotos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePhotos(photos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

function dateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function renderCalendar() {
  el.monthLabel.textContent = `${state.year}년 ${state.month + 1}월`;
  el.grid.innerHTML = "";

  const photos = loadPhotos();
  const firstDay = new Date(state.year, state.month, 1).getDay();
  const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
  const today = todayKey();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day-cell empty";
    el.grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(state.year, state.month, day);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-label", `${key} 사진 보기`);
    if (key === today) cell.classList.add("today");

    const num = document.createElement("span");
    num.className = "date-num";
    num.textContent = String(day);
    cell.appendChild(num);

    if (photos[key]) {
      cell.classList.add("has-photo");
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = photos[key];
      img.alt = `${key} 사진`;
      cell.appendChild(img);
    }

    cell.addEventListener("click", () => openDay(key));
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDay(key);
      }
    });
    el.grid.appendChild(cell);
  }
}

function openDay(key) {
  state.selectedDate = key;
  const [y, m, d] = key.split("-").map(Number);
  el.modalDateLabel.textContent = `${m}월 ${d}일`;

  const photos = loadPhotos();
  const photo = photos[key];

  if (photo) {
    el.photoImg.src = photo;
    el.photoImg.hidden = false;
    el.photoPlaceholder.hidden = true;
    el.photoPreview.classList.remove("empty");
    el.deletePhotoBtn.hidden = false;
  } else {
    el.photoImg.hidden = true;
    el.photoImg.src = "";
    el.photoPlaceholder.hidden = false;
    el.photoPreview.classList.add("empty");
    el.deletePhotoBtn.hidden = true;
  }

  el.modal.classList.remove("hidden");
}

function closeDay() {
  el.modal.classList.add("hidden");
  el.cameraInput.value = "";
  state.selectedDate = null;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !state.selectedDate) return;

  try {
    const dataUrl = await compressImage(file);
    const photos = loadPhotos();
    photos[state.selectedDate] = dataUrl;
    savePhotos(photos);
    openDay(state.selectedDate);
    renderCalendar();
  } catch (err) {
    alert("사진을 저장하지 못했어요. 다시 시도해주세요.");
  }
}

function deleteCurrentPhoto() {
  if (!state.selectedDate) return;
  const photos = loadPhotos();
  delete photos[state.selectedDate];
  savePhotos(photos);
  openDay(state.selectedDate);
  renderCalendar();
}

el.prevMonth.addEventListener("click", () => {
  state.month -= 1;
  if (state.month < 0) {
    state.month = 11;
    state.year -= 1;
  }
  renderCalendar();
});

el.nextMonth.addEventListener("click", () => {
  state.month += 1;
  if (state.month > 11) {
    state.month = 0;
    state.year += 1;
  }
  renderCalendar();
});

el.closeModal.addEventListener("click", closeDay);
el.modal.addEventListener("click", (e) => {
  if (e.target === el.modal) closeDay();
});

el.takePhotoBtn.addEventListener("click", () => el.cameraInput.click());
el.cameraInput.addEventListener("change", handlePhotoSelected);
el.deletePhotoBtn.addEventListener("click", deleteCurrentPhoto);

renderCalendar();

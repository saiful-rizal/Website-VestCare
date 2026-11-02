import { useEffect, useRef, useState } from "react";

function normalizeDetections(payload) {
  const items = Array.isArray(payload) ? payload : payload?.deteksi;

  if (!Array.isArray(items)) {
    throw new Error("Respons server tidak berisi daftar deteksi yang valid.");
  }

  const warningLevel = {
    aman: "Rendah",
    waspada: "Sedang",
    bahaya: "Tinggi",
  }[payload?.peringatan?.tingkat] || "Sedang";
  const time = payload?.waktu
    ? new Date(payload.waktu.replace(" ", "T")).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return items.map((item) => ({
    ...item,
    object: formatObjectName(item.kelas),
    confidence: Number(item.confidence ?? 0) * 100,
    distance: Number.isFinite(Number(item.jarak_m)) ? Number(item.jarak_m) : 0,
    distanceSource: item.sumber_jarak || payload?.sumber_jarak || "estimasi_yolo_bbox",
    urgency: warningLevel,
    time,
  }));
}

function formatObjectName(value) {
  const name = String(value || "Tidak dikenal").trim().toLowerCase();
  return name ? `${name[0].toUpperCase()}${name.slice(1)}` : "Tidak dikenal";
}

export default function CameraCapture({ onDetections }) {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const frameTimerRef = useRef(null);
  const frameInFlightRef = useRef(false);
  const lastDashboardSyncRef = useRef(0);
  const onDetectionsRef = useRef(onDetections);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [detections, setDetections] = useState([]);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onDetectionsRef.current = onDetections;
  }, [onDetections]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    socketRef.current?.close();
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (status !== "camera") return undefined;

    function detectFrame() {
      const video = videoRef.current;
      const socket = socketRef.current;
      if (!video || !video.videoWidth || !socket || socket.readyState !== WebSocket.OPEN || frameInFlightRef.current) return;

      frameInFlightRef.current = true;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          frameInFlightRef.current = false;
          return;
        }

        socket.send(await blob.arrayBuffer());
      }, "image/jpeg", 0.75);
    }

    const socketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${socketProtocol}//${window.location.host}/api/detect/ws`);
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      socketRef.current = socket;
      setMessage("Koneksi realtime aktif.");
      frameTimerRef.current = setInterval(detectFrame, 250);
    };
    socket.onmessage = (event) => {
      frameInFlightRef.current = false;
      try {
        const payload = JSON.parse(event.data);
        if (payload.error) throw new Error(payload.error);
        const nextDetections = normalizeDetections(payload);
        setDetections(nextDetections);
        setSourceSize({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
        if (nextDetections.length) {
          setMessage(`${nextDetections.length} objek • realtime`);
          if (Date.now() - lastDashboardSyncRef.current >= 2000) {
            lastDashboardSyncRef.current = Date.now();
            onDetectionsRef.current(nextDetections);
          }
        } else {
          setMessage("Tidak ada objek terdeteksi.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Respons realtime tidak valid.");
      }
    };
    socket.onerror = () => setMessage("Koneksi realtime ke server gagal.");
    socket.onclose = () => {
      frameInFlightRef.current = false;
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
      socketRef.current = null;
    };
    return () => {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
      socket.close();
      socketRef.current = null;
    };
  }, [status]);

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      inputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setStatus("camera");
      setMessage("");
      setPreview(null);
      setFile(null);
      setDetections([]);
      setSourceSize({ width: 0, height: 0 });
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? `Kamera tidak dapat dibuka: ${error.message}` : "Kamera tidak dapat dibuka.");
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setDetections([]);
    setSourceSize({ width: 0, height: 0 });
    setStatus("ready");
    setMessage("");
  }

  function closePreview() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setDetections([]);
    setSourceSize({ width: 0, height: 0 });
    setStatus("idle");
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submitDetection() {
    if (!file) return;

    setStatus("loading");
    setMessage("");
    const body = new FormData();
    body.append("gambar", file);

    try {
      const response = await fetch("/api/detect", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        throw new Error(`Server deteksi mengembalikan ${response.status}.`);
      }

      const detections = normalizeDetections(await response.json());
      setDetections(detections);
      setSourceSize({
        width: imageRef.current?.naturalWidth || 0,
        height: imageRef.current?.naturalHeight || 0,
      });
      onDetections(detections);
      setStatus("success");
      setMessage(`${detections.length} deteksi berhasil ditambahkan.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Deteksi gagal diproses.");
    }

  }

  function renderDetectionBoxes() {
    if (!sourceSize.width || !sourceSize.height) return null;

    return detections.map((detection, index) => {
      const box = detection.bbox_xyxy;
      if (!Array.isArray(box) || box.length !== 4) return null;
      const [x1, y1, x2, y2] = box;

      return (
        <div
          key={`${detection.object}-${index}`}
          className="pointer-events-none absolute border-2 border-red-500"
          style={{
            left: `${(x1 / sourceSize.width) * 100}%`,
            top: `${(y1 / sourceSize.height) * 100}%`,
            width: `${((x2 - x1) / sourceSize.width) * 100}%`,
            height: `${((y2 - y1) / sourceSize.height) * 100}%`,
          }}
        >
          <span className="absolute -top-6 left-[-2px] whitespace-nowrap bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
            {detection.object} {(detection.confidence || 0).toFixed(0)}% • {detection.distance.toFixed(2)} m
          </span>
        </div>
      );
    });
  }

  return (
    <>
      <button
        type="button"
        className="vc-camera-fab"
        aria-label="Ambil foto untuk deteksi"
        onClick={openCamera}
      >
        <i className="ni ni-camera-compact" aria-hidden="true"></i>
        <span>Deteksi</span>
      </button>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      {preview && (
        <div className="vc-camera-backdrop" role="dialog" aria-modal="true" aria-label="Pratinjau foto">
          <div className="vc-camera-dialog">
            <div className="flex items-center justify-between mb-4">
              <h2 className="mb-0 text-lg font-bold text-slate-800">Deteksi dari kamera</h2>
              <button type="button" className="vc-camera-close" onClick={closePreview} aria-label="Tutup">×</button>
            </div>
            <div className="relative overflow-hidden rounded-xl">
              <img
                ref={imageRef}
                className="vc-camera-preview"
                src={preview}
                alt="Pratinjau foto yang dipilih"
                onLoad={(event) => {
                  if (!sourceSize.width) {
                    setSourceSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    });
                  }
                }}
              />
              {renderDetectionBoxes()}
            </div>
              <p className="mt-3 text-sm text-slate-600">
                Jarak terdekat: {detections.length ? `${Math.min(...detections.map((d) => d.distance)).toFixed(2)} m` : "-"}
                {" "}• dihitung dari bounding box YOLO
              </p>
            {message && <p className={`vc-camera-message ${status === "error" ? "is-error" : ""}`}>{message}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="vc-camera-secondary" onClick={openCamera}>Ambil ulang</button>
              <button type="button" className="vc-camera-primary" onClick={submitDetection} disabled={status === "loading"}>
                {status === "loading" ? "Memproses..." : "Kirim untuk deteksi"}
              </button>
            </div>
          </div>
        </div>
      )}
      {status === "camera" && (
        <div className="vc-camera-backdrop" role="dialog" aria-modal="true" aria-label="Kamera">
          <div className="vc-camera-dialog">
            <div className="flex items-center justify-between mb-4">
              <h2 className="mb-0 text-lg font-bold text-slate-800">Ambil foto deteksi</h2>
              <button type="button" className="vc-camera-close" onClick={closePreview} aria-label="Tutup">×</button>
            </div>
            <div className="relative overflow-hidden rounded-xl">
              <video ref={videoRef} className="vc-camera-preview" autoPlay playsInline muted />
              {renderDetectionBoxes()}
            </div>
            {message && <p className="vc-camera-message is-error">{message}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="vc-camera-secondary" onClick={closePreview}>Batal</button>
              <span className="vc-camera-live-status">● Deteksi otomatis aktif</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

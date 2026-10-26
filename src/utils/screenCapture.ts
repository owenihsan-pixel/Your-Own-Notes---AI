export async function captureScreenFrame(): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Fitur tangkapan layar (Screen Capture API) tidak didukung di browser ini.');
  }

  // Request display stream
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'monitor',
    },
    audio: false,
  });

  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        await video.play();
        // Give a tiny frame delay for video to render crisp frame
        setTimeout(() => {
          const maxDim = 1600;
          let w = video.videoWidth || 1920;
          let h = video.videoHeight || 1080;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            stream.getTracks().forEach((track) => track.stop());
            reject(new Error('Gagal menginisialisasi canvas context'));
            return;
          }

          ctx.drawImage(video, 0, 0, w, h);
          // image/jpeg with 0.85 compression reduces payload from ~10MB to ~200KB with crystal clear OCR
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Stop all stream tracks immediately
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;

          resolve({
            dataUrl,
            width: w,
            height: h,
          });
        }, 200);
      } catch (err) {
        stream.getTracks().forEach((track) => track.stop());
        reject(err);
      }
    };

    video.onerror = (err) => {
      stream.getTracks().forEach((track) => track.stop());
      reject(err);
    };
  });
}

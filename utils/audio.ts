export const playNotificationSound = () => {
  try {
    // Dùng cho thông báo hệ thống
    const audio = new Audio('/sound/noti.mp3');
    audio.volume = 0.5;
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Đã phát âm thanh thông báo.");
        })
        .catch((error) => {
          console.error("Lỗi phát thông báo:", error);
        });
    }
  } catch (error) {
    console.error("Lỗi code audio:", error);
  }
};

export const playMessageSound = () => {
  try {
    // Dùng cho tin nhắn chat
    const audio = new Audio('/sound/msg.mp3');
    audio.volume = 0.6;
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Đã phát âm thanh tin nhắn.");
        })
        .catch((error) => {
          console.error("Lỗi phát tin nhắn:", error);
        });
    }
  } catch (error) {
    console.error("Lỗi code audio:", error);
  }
};
import axios from "../../lib/axios";

function isMobile() {
  // 通过ua判断是否为移动端设备
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

export async function openFile(path: string, type: "folder" | "file") {
  if (isMobile()) {
    window.open(`/movie?path=${encodeURIComponent(path)}`, "_blank");
  } else {
    await axios.post(`/api/open`, {
      path,
      type,
    });
  }
};

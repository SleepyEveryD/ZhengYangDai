export function forceLogout() {
  localStorage.clear();
  sessionStorage.clear();

  // replace 防止用户点返回
  window.location.replace('/login');
}

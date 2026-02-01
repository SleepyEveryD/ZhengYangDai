export function forceLogout() {
  localStorage.clear();
  sessionStorage.clear();

  // replace avoid user goes back
  window.location.replace('/login');
}

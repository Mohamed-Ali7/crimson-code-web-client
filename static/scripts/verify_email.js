$(document).ready(async function () {

  const host = window.API_URL;

  const accessToken = Cookies.get(`access_token`);
  let isUserLoggedIn = true;

  if (!accessToken) {
    isUserLoggedIn = await checkAuth();
  }

  if (isUserLoggedIn) {
    $.ajax({
      method: "GET",
      url: `${host}/api/users/me`,
      headers: { 'Authorization': 'Bearer ' + accessToken },
      success: () => {
        window.location = `/home`
      }
    });
  }
  
  
  const urlParams = new URLSearchParams(window.location.search);

  const token = urlParams.get(`token`);

  $(`.send-verification-mail-btn`).on(`click`, function () {
    window.location = `/verification-request`;
  });

  $.ajax({
    method: `GET`,
    url: `${host}/api/auth/email-verification?token=${token}`,
    success: function (data) {
      sessionStorage.setItem(`flush_message`, `Your email has been verified successfully`);
      window.location = `/login`;
    },
    error: function(respose) {
      $(`.verify-failure`).show();
      $(`.send-verification-mail-btn`).show();
    },
    complete: function () {
      $(`#loading-spinner`).hide();
    }
  });
}); 
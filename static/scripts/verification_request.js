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

  function showError(inputField, message) {
    inputField.addClass('error');
    $('.error-message').css(`visibility`, `visible`).text(message);
  }

  function clearErrors(inputField) {
    inputField.removeClass(`valid`);
    inputField.removeClass('error');
    $('.error-message').css(`visibility`, `hidden`);
  }

  function isEmailValid(emailInput) {
    clearErrors(emailInput)
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(emailInput.val().trim())) {
      showError(emailInput, `Please enter a valid email address`);
      return false;
    }
    emailInput.addClass(`valid`)
    return true;
  }

  $(`.email-input`).on(`blur`, function () {
    isEmailValid($(this));
  });

  $('.verification-request-form').on('submit', (e) => {
    e.preventDefault();

    const emailInput = $('.email-input');

    if (!isEmailValid(emailInput)) {
      return;
    }

    emailInput.removeClass(`valid`);

    const userData = {
      email: emailInput.val().trim(),
    };

    $(`#loading-spinner`).show();

    $.ajax({
      method: "POST",
      url: `${host}/api/auth/email-verification-request`,
      data: JSON.stringify(userData),
      contentType: 'application/json',
      success: (data) => {
        sessionStorage.setItem(
          'flush_message',
          'A verification link has been sent to your email'
        );
        window.location = `/login`
      },
      error: (response) => {

        if (response.status === 404) {
          showError($(`.email-input`), `This email address doesn't exist.`);
        } else if (response.status === 400) {
          showError($(`.email-input`), `Your email has been already verified`);
        }
      },
      complete: function () {
        $(`#loading-spinner`).hide();
      }
    });
  });
});
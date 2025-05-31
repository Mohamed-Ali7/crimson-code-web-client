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

  $.ajax({
    method: `GET`,
    url: `${host}/api/users/password-reset/validate?token=${token}`,
    success: function () {
      $(`.password-reset-card`).show();
      return;
    },
    error: function () {
      $(`.error-message-container`).show();
      $(`.requset-new-rest-link-btn`).show();
    },
    complete: function () {
      $(`#loading-spinner`).hide();
    }
  });

  $(`.requset-new-rest-link-btn`).on(`click`, function () {
    window.location = `/password-reset-request`;
  });

  function showError(inputField, message) {
    inputField.addClass('error');
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `visible`).text(message);
  }

  function clearErrors(inputField) {
    inputField.removeClass(`valid`);
    inputField.removeClass('error');
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `hidden`);
  }

  function isNewPasswordValid(newPasswordInput) {
    clearErrors(newPasswordInput);
    if (newPasswordInput.val().trim().length < 8) {
      showError(newPasswordInput, 'Password must be at least 8 characters.');
      return false;
    }
    newPasswordInput.addClass('valid');
    return true;
  }

  function isConfirmPasswordValid(confirmPasswordInput) {
    clearErrors(confirmPasswordInput);
    if ($('.new-password-input').val().trim() !== confirmPasswordInput.val().trim()) {
      showError(confirmPasswordInput, 'Passwords do not match.');
      return false;
    }
    if (confirmPasswordInput.val().trim().length === 0) {
      return false
    }
    confirmPasswordInput.addClass('valid');
    return true;
  }

  $(`.new-password-input`).on(`blur`, function () {
    isNewPasswordValid($(this));
    clearErrors($(`.confirm-password-input`));
  });

  $(`.confirm-password-input`).on(`blur`, function () {
    isConfirmPasswordValid($(this));
  });

  $('.bi-eye-slash').on('click', function () {
    const passwordInput = $(this).prev($('input'));
    if (passwordInput.attr('type') === 'password') {
      passwordInput.attr('type', 'text');
    } else {
      passwordInput.attr('type', 'password');
    }
    $(this).toggleClass('bi-eye');
  });

  $('.password-reset-form').on('submit', (e) => {
    e.preventDefault();

    const newPasswordInput = $('.new-password-input');
    const confirmPasswordInput = $(`.confirm-password-input`);

    if (!isNewPasswordValid(newPasswordInput) || !isConfirmPasswordValid(confirmPasswordInput)) {
      return;
    }

    const passwordResetData = {
      newPassword: newPasswordInput.val().trim(),
      confirmPassword: confirmPasswordInput.val().trim(),
      token: token,
    };

    $(`#loading-spinner`).show();

    $.ajax({
      method: "POST",
      url: `${host}/api/users/password-reset/confirm`,
      data: JSON.stringify(passwordResetData),
      contentType: 'application/json',
      success: (data) => {
        sessionStorage.setItem('flush_message', 'Password Reset Successful')
        window.location = `/login`;
      },
      error: (response) => {
        if (response.status === 400) {
          $(`.form-input`).removeClass(`valid`);
          $(`.new-password-input`).addClass(`error`);
          showError($(`.confirm-password-input`), response.responseJSON.message);
        } else {
          console.error(response.responseJSON.message);
        }
      },
      complete: function () {
        $(`#loading-spinner`).hide();
      }
    });
  });
});
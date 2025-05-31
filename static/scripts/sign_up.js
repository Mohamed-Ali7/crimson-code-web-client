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
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `visible`).text(message);
  }

  function clearErrors(inputField) {
    inputField.removeClass(`valid`);
    inputField.removeClass('error');
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `hidden`);
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

  function isPasswordValid(passwordInput) {
    clearErrors(passwordInput);
    if (passwordInput.val().trim().length < 8) {
      showError(passwordInput, 'Password must be at least 8 characters.');
      return false;
    }

    passwordInput.addClass('valid');
    return true;
  }

  function isConfirmPasswordValid(confirmPasswordInput) {
    clearErrors(confirmPasswordInput);
    if ($('.password-input').val().trim() !== confirmPasswordInput.val().trim()) {
      showError(confirmPasswordInput, 'Passwords do not match.');
      return false;
    }
    if (confirmPasswordInput.val().trim().length === 0) {
      return false
    }
    confirmPasswordInput.addClass('valid');
    return true;
  }

  function isNameValid(nameInput, type) {
    clearErrors(nameInput);

    if (nameInput.val().trim() === '') {
      showError(nameInput, `${type} cannot be empty.`);
      return false;
    }

    nameInput.addClass(`valid`)
    return true;
  }

  $(`.email-input`).on(`blur`, function () {
    isEmailValid($(this));
  });

  $(`.password-input`).on(`blur`, function () {
    isPasswordValid($(this));
    clearErrors($(`.confirm-password-input`));
  });
  
  $(`.confirm-password-input`).on(`blur`, function () {
    isConfirmPasswordValid($(this));
  });
  
  $(`.first-name-input`).on(`blur`, function () {
    isNameValid($(this), `First Name`);
  });

  $(`.last-name-input`).on(`blur`, function () {
    isNameValid($(this), `Last Name`);
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

  $('.sign-up-form').on('submit', (e) => {
    e.preventDefault();

    const emailInput = $('.email-input');
    const passwordInput = $('.password-input');
    const confirmPasswordInput = $(`.confirm-password-input`);
    const firstNameInput = $(`.first-name-input`);
    const lastNameInput = $(`.last-name-input`);

    if (!isEmailValid(emailInput) || !isPasswordValid(passwordInput) || !isNameValid(firstNameInput) ||
    !isConfirmPasswordValid(confirmPasswordInput) || !isNameValid(lastNameInput)) {
      return;
    }

    
    const userData = {
      email: emailInput.val().trim(),
      password: passwordInput.val().trim(),
      confirmPassword: confirmPasswordInput.val().trim(),
      firstName: firstNameInput.val().trim(),
      lastName: lastNameInput.val().trim(),
    };

    $(`.sign-up-btn`).prop(`disabled`, true);
    $(`#loading-spinner`).show();
    $.ajax({
      method: "POST",
      url: `${host}/api/auth/register`,
      data: JSON.stringify(userData),
      contentType: 'application/json',
      success: (data) => {
        sessionStorage.setItem('flush_message',
          'You have signed up successfully, '+
          'a verification link has sent to your email'
        )
        window.location = `/login`
      },
      error: (response) => {
        $(`.sign-up-btn`).prop(`disabled`, false);
        if(response.responseJSON.message === 'This email already exists') {
          $(`.email-input`).removeClass(`valid`);
          showError($(`.email-input`), response.responseJSON.message);
        } else {
          console.error(response.responseJSON.message)
        }
      },
      complete: function () {
        $(`#loading-spinner`).hide();
      }
    });
  });
});
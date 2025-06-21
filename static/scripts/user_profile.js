$(document).ready(async function () {

  const host = window.API_URL;

  const pathSegments = window.location.pathname.split(`/`).filter(Boolean);

  const userProfileId = pathSegments[0] === `users` && pathSegments[1] ? pathSegments[1] : null;

  let accessToken = Cookies.get(`access_token`);
  let currentUserPublicId;
  let isAdmin;

  if (!userProfileId) {
    window.location = `/not-found`;
    return;
  }

  let isUserLoggedIn = true;

  if (!accessToken) {
    isUserLoggedIn = await checkAuth();
    accessToken = Cookies.get(`access_token`);
  }

  if (accessToken) {
    const decodedJwtToken = decodeJwt(accessToken);
    if (decodedJwtToken) {
      currentUserPublicId = decodedJwtToken.userPublicId;
      isAdmin = decodedJwtToken.roles.includes(`ROLE_ADMIN`);
    }
  }

  function decodeJwt(token) {
    try {
      var base64Url = token.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (error) {
      return null;
    }

    return JSON.parse(jsonPayload);
  }


  $.ajax({
    method: `GET`,
    url: `${host}/api/users/${decodeURIComponent(userProfileId)}`,
    success: function (user) {

      const profileAvatar = $(`.avatar`);
      const profileAvatarImage = $(`.avatar-image`);
      const currentAvatar = $(`#current-avatar`);

      if (user.profileImgUrl) {
        profileAvatarImage.attr(`src`, `${user.profileImgUrl}`);
      } else {
        profileAvatarImage.attr(`src`, '/static/images/default_profile_pic.png');
      }

      currentAvatar.attr(`src`, profileAvatarImage.attr(`src`));

      profileAvatarImage.on(`error`, function () {
        const defaultSrc = '/static/images/default_profile_pic.png';
        if ($(this).attr('src') !== defaultSrc) {
          profileAvatarImage.attr('src', defaultSrc);
          currentAvatar.attr(`src`, defaultSrc);
        }
      });

      const userInfo = $(`.user-info`);
      $(`.user-profile-name`).text(`${user.firstName} ${user.lastName}`);

      const joinedDate = new Date(user.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      $(`.joined-date`).text(`Joined: ${joinedDate}`);

      const userInfoButton = $(`.profile-header .user-info button`);

      if (currentUserPublicId) {
        userInfoButton.show();
        if (currentUserPublicId === userProfileId) {
          userInfoButton.text(`Edit Profile`).addClass(`edit-profile-btn`);

          if (isAdmin) {
            $(`.delete-account-btn`).remove();
          }

          $(`#first-name`).val(user.firstName);
          $(`#last-name`).val(user.lastName);
        } else {
          if (isAdmin) {
            userInfo.append($(`.delete-account-btn`).css(`margin`, `-0.8rem 0 0 0`));
          }
          if (user.isFollowing) {
            userInfoButton.addClass(`unfollow-btn`).text(`Unfollow`);
            userInfoButton.data(`user-id`, user.publicId)
          } else {
            userInfoButton.addClass(`follow-btn`).text(`Follow`);
            userInfoButton.data(`user-id`, user.publicId)
          }

        }

      } else {
        $(`.user-profile-name`).css(`margin-bottom`, `1rem`);
        $(`.user-meta`).append($(`.follow-meta`).css(`margin-top`, `0.3rem`)).next(`div`).remove();
      }

      laodUserPosts(1);
      loadUserFollowers(1);
      loadUserFollowing(1)
    },
    error: function (response) {
      $(`#loading-spinner`).hide();
      if (response.status === 404) {
        window.location = `/not-found`;
      } else {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(`An error occurred while sending the request, please try again later`)
        }
      }
    }
  });

  $(`.avatar-image`).on(`click`, function () {
    window.open($(this).attr('src'), '_blank');
  });

  function laodUserPosts(page) {
    $.ajax({
      method: `GET`,
      url: `${host}/api/users/${userProfileId}/posts?page=${page}&size=5&sort_dir=desc`,
      success: function (postPage) {
        const postTabContent = $(`.post-tab-content`).empty();

        $(`.posts-count`).text(`Posts: ${postPage.totalElements}`);
        const posts = postPage.content;

        posts.forEach(post => {
          const postCard = $(`<div class="post-card"></div>`);
          const postTitle = $(`<h2 class="post-title"></h2>`).text(post.title);
          const postExcerpt = $(`<p class="post-excerpt"></p>`).text(post.content);

          const postCardBottom = $(`<div class="post-card-bottom"></div>`);
          const postPublishDate = $(`<span class="post-publish-date"></span>`)

          const publishDate = new Date(post.createdAt)
            .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: `numeric` });
          postPublishDate.text('Published: ' + publishDate);

          const readMoreBtn = $(`<a class="read-more-btn">Read More</a>`);
          readMoreBtn.attr(`href`, `/posts/${post.id}`);

          postCardBottom.append(postPublishDate, readMoreBtn);

          postCard.append(postTitle, postExcerpt, postCardBottom);

          postTabContent.append(postCard);

        });

        const paginationControls = $(`<div id="pagination" class=" pagination-controls posts-pagination"></div>`)
        postTabContent.append(paginationControls);
        renderPagination(postPage.pageNumber, postPage.totalPages, paginationControls);
      },
      error: function (response) {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(`An error occurred while sending the request, please try again later`)
        }
      },
      complete: function () {
        $(`#loading-spinner`).hide();
      }
    });
  }

  $(document).on(`click`, `.posts-pagination button`, function () {
    laodUserPosts($(this).text());
  });

  $(document).on(`click`, `.followers-pagination button`, function () {
    loadUserFollowers($(this).text());
  });

  $(document).on(`click`, `.following-pagination button`, function () {
    loadUserFollowing($(this).text());
  });

  function renderPagination(currentPage, totalPages, paginationControls) {

    const totalButtons = 5;
    const pages = [];

    paginationControls.empty();

    if (totalPages <= totalButtons) {

      for (let i = 1; i <= totalPages; i++) {
        const button = $(`<button>${i}</button>`);
        if (i === currentPage) {
          button.addClass(`active`);
        }
        paginationControls.append(button);
      }
      return;
    }

    pages.push(1);

    const start = currentPage >= totalPages - 1 ? Math.max(2, totalPages - 3) : Math.max(2, currentPage - 1);
    const end = currentPage <= 2 ? Math.min(4, totalPages - 1) : Math.min(currentPage + 1, totalPages - 1);

    if (start > 2) {
      pages.push(`...`);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push(`...`);
    }

    for (let page of pages) {
      if (page === `...`) {
        paginationControls.append($(`<span>...</span>`));
      } else {
        const button = $(`<button>${page}</button>`);
        if (page === currentPage) {
          button.addClass(`active`);
        }
        paginationControls.append(button);
      }
    }

    const lastButton = $(`<button>${totalPages}</button>`);
    if (totalPages === currentPage) {
      lastButton.addClass(`active`);
    }
    paginationControls.append(lastButton);
  }

  $(`.user-info`).on(`click`, `.edit-profile-btn`, function () {

    $(`.input-edit-group input`).prop(`disabled`, true);
    $(`.edit-btn`).css(`visibility`, `visible`);

    $(`#edit-profile-modal`).removeClass(`hidden`);

  });

  $(`.edit-btn`).on(`click`, function () {

    inputField = $(this).closest(`.input-edit-group`).find(`input`);

    inputField.prop(`disabled`, false);

    $(this).css(`visibility`, `hidden`)
    inputField.focus();
  });

  $(`#new-profile-pic`).on(`change`, function () {
    const reader = new FileReader();

    const image = $(this).prop(`files`)[0];

    if (isProfileImageValid(image)) {

      reader.readAsDataURL(image);
      reader.onload = function (e) {
        $(`#current-avatar`).attr(`src`, e.target.result);
      };
    }
  });

  function isProfileImageValid(image) {
    if (image.size > 2 * 1024 * 1024) { // 2MB
      $(`#current-avatar`).addClass(`error`);
      $(`.profile-picture-wrapper`).next(`.error-message`).css(`visibility`, `visible`)
        .text(`File size exceeds 2MB limit. Please choose a smaller image.`);
      return false;
    }

    $(`#current-avatar`).removeClass(`error`);
    $(`.profile-picture-wrapper`).next(`.error-message`).css(`visibility`, `hidden`);
    return true;
  }

  $(`#edit-profile-form`).on(`submit`, function (e) {

    e.preventDefault();

    $(`#loading-spinner`).show();

    const updatePromises = [];

    const firstNameInput = $(`#first-name`);
    const lastNameInput = $(`#last-name`);

    if (!firstNameInput.prop(`disabled`) || !lastNameInput.prop(`disabled`)) {

      const firstName = firstNameInput.val().trim();
      const lastName = lastNameInput.val().trim()

      if (!isNameValid(firstNameInput, `First Name`) || !isNameValid(lastNameInput, `Last Name`)) {
        $(`#loading-spinner`).hide();
        return;
      }

      $(`.save-btn`).prop(`disabled`, true);

      const nameUpdate = $.ajax({
        method: `PUT`,
        url: `${host}/api/users/${userProfileId}`,
        data: JSON.stringify({ firstName: firstName, lastName: lastName }),
        contentType: `application/json`,
        headers: { 'Authorization': 'Bearer ' + accessToken },
        success: function (updatedUser) {
          const fullName = `${updatedUser.firstName} ${updatedUser.lastName}`;
          $(`.user-profile-name`).text(fullName);

          $(`.profile-details .user-name`).text(fullName);
        },
        error: function (response) {
          $(`.save-btn`).prop(`disabled`, false);
          if (response.responseJSON) {
            console.error(response.responseJSON.message);
          } else {
            console.error(`An error occurred while sending the request, please try again later`)
          }
        }
      });

      updatePromises.push(nameUpdate);
    }

    const newProfilePicture = $(`#new-profile-pic`).prop(`files`)[0];

    if (newProfilePicture) {

      const formData = new FormData();

      formData.append(`profilePicture`, newProfilePicture)

      const profilePictureUpdate = $.ajax({
        method: `PUT`,
        url: `${host}/api/users/me/profile-picture`,
        data: formData,
        headers: { Authorization: 'Bearer ' + accessToken },
        processData: false,
        contentType: false,
        success: function () {
          const reader = new FileReader();
          reader.readAsDataURL(newProfilePicture);

          reader.onload = function (e) {
            $(`.avatar-image`).attr(`src`, e.target.result);
            $(`.profile-details .profile-pic img`).attr(`src`, e.target.result);
          };
        },
        error: function (response) {
          $(`.save-btn`).prop(`disabled`, false);
          if (response.responseJSON) {
            console.error(response.responseJSON.message);
          } else {
            console.error(`An error occurred while sending the request, please try again later`)
          }
        }
      });

      updatePromises.push(profilePictureUpdate);
    }

    if (!$(`#password-fields`).hasClass(`hidden`)) {
      const currentPasswordInput = $(`.current-password-input`);
      const newPasswordInput = $(`.new-password-input`);
      const confirmPasswordInput = $(`.confirm-password-input`);

      const currentPassword = $(`.current-password-input`).val().trim();
      const newPassword = $(`.new-password-input`).val().trim();
      const confirmPassword = $(`.confirm-password-input`).val().trim();

      currentPasswordInput.on(`blur`, function () {
        if (currentPassword) {
          clearPasswordError($(this));
        }
      });

      newPasswordInput.on(`blur`, function () {
        if (newPassword) {
          clearPasswordError($(this));
        }
      });

      confirmPasswordInput.on(`blur`, function () {
        if (confirmPassword) {
          clearPasswordError($(this));
        }
      });

      if (!isCurrentPasswordValid(currentPasswordInput) || !isNewPasswordValid(newPasswordInput) ||
        !isConfirmPasswordValid(confirmPasswordInput)) {
        $(`#loading-spinner`).hide();
        return;
      }

      const passwordData = {
        currentPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      }

      const passwordUpdate = $.ajax({
        method: `PUT`,
        url: `${host}/api/users/me/change-password`,
        data: JSON.stringify(passwordData),
        contentType: `application/json`,
        headers: { Authorization: 'Bearer ' + accessToken },
        error: function (response) {
          $(`.save-btn`).prop(`disabled`, false);
          if (response.responseJSON) {

            if (response.status === 400) {
              showPasswordError(currentPasswordInput, response.responseJSON.message);
            } else {
              console.error(response.responseJSON.message);
            }
          } else {
            console.error(`An error occurred while sending the request, please try again later`)
          }
        }
      });
      updatePromises.push(passwordUpdate);
    }

    Promise.all(updatePromises).then(() => {
      $(`#loading-spinner`).hide();

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Your changes have been saved successfully.',
        timer: 1300,
        showConfirmButton: false,
        scrollbarPadding: false
      });
      $(`#edit-profile-modal`).addClass(`hidden`);
    }).catch((error) => {
      if (error.status === 401) {
        checkAuth(false).then(success => {
          if (success) {
            $(`#edit-profile-form`).submit();
          }
        });
      } else {
        console.error('An error occurred:', error);
      }
    }).finally(() => {
      $(`#loading-spinner`).hide();
      $(`.save-btn`).prop(`disabled`, false);
    });
    localStorage.removeItem(`user`);

  });


  $(`.delete-account-btn`).on(`click`, function (e) {

    e.preventDefault();

    let messageSegment = `your`;
    if (isAdmin) {
      messageSegment = `this`
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `This action will permanently delete ${messageSegment} account.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e3342f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      scrollbarPadding: false
    }).then((result) => {
      if (result.isConfirmed) {
        $(`#loading-spinner`).show();
        $(this).prop(`disabled`, true);
        $.ajax({
          method: 'DELETE',
          url: `${host}/api/users/${userProfileId}`,
          headers: { Authorization: 'Bearer ' + accessToken },
          success: function () {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Your account has been successfully deleted.',
              timer: 1500,
              showConfirmButton: false,
              scrollbarPadding: false
            });

            if (!isAdmin) {
              Cookies.remove(`access_token`);
              Cookies.remove(`refresh_token`);
              localStorage.removeItem(`user`);
              window.location = '/login';
            } else {
              window.location = '/home';
            }

          },
          error: function (response) {
            $(this).prop(`disabled`, false);
            if (response.responseJSON) {
              console.error(response.responseJSON.message);
            } else {
              console.error(`An error occurred while sending the request, please try again later`)
            }
          },
          complete: function () {
            $(`#loading-spinner`).hide();
          }
        });
      }
    });
  });

  $(`.tab`).on(`click`, function (e) {

    $(`.tab`).removeClass(`active`);
    $(this).addClass(`active`);

    const activeTabContent = $(this).data(`tab`);

    $(`.profile-content > div`).hide();

    $(`#${activeTabContent}`).show();
  });

  $(`.profile-container`).on(`click`, `.unfollow-btn`, function () {
    followOrUnfollowUser(`unfollow`, `DELETE`, $(this));
  });

  $(`.profile-container`).on(`click`, `.follow-btn`, function () {
    followOrUnfollowUser(`follow`, `POST`, $(this));
  });

  function followOrUnfollowUser(action, method, btn) {

    btn.prop(`disabled`, true);
    btn.html($(`<div class="spinner"></div>`));

    $.ajax({
      method: method,
      url: `${host}/api/users/${decodeURIComponent(btn.data(`user-id`))}/follow`,
      headers: { Authorization: 'Bearer ' + accessToken },
      success: function (data) {
        if (action === `follow`) {
          btn.html(`Unfollow`).removeClass(`follow-btn`).addClass(`unfollow-btn`);
        } else {
          btn.html(`Follow`).removeClass(`unfollow-btn`).addClass(`follow-btn`);
        }
      },
      error: function (response) {

        btn.html(action);

        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(`An error occurred while sending the request, please try again later`)
        }
      },
      complete: function () {
        btn.prop(`disabled`, false);
      }
    });
  }

  function loadUserFollowers(page) {
    loadFollowersOrFollowing(page, `followers`);
  }

  function loadUserFollowing(page) {
    loadFollowersOrFollowing(page, `following`);
  }

  function loadFollowersOrFollowing(page, type) {

    const userType = type === `followers` ? `follower` : `following`;
    $.ajax({
      url: `${host}/api/users/${decodeURIComponent(userProfileId)}/${type}?page=${page}`,
      method: `GET`,
      success: function (usersPage) {
        const users = usersPage.content;

        if (type === `following`) {
          $(`.following-count`).text(`Following: ${usersPage.totalElements}`);
        } else {
          $(`.followers-count`).text(`Followers: ${usersPage.totalElements}`);
        }

        const tabContent = $(`#${type}`).empty();
        for (const user of users) {

          const userContainer = $(`<div class="${userType}-user-container"></div>`);
          const userMeta = $(`<div class="${userType}-user-meta"></div>`);
          const userImgContainer = $(`<div class="${userType}-user-img-container"></div>`);
          const userImg = $(`<img class="${userType}-user-img">`);

          if (user.profileImgUrl) {
            userImg.attr(`src`, `${user.profileImgUrl}`);
          } else {
            userImg.attr(`src`, '/static/images/default_profile_pic.png');
          }

          userImg.on(`error`, function () {
            const defaultSrc = '/static/images/default_profile_pic.png';
            if ($(this).attr('src') !== defaultSrc) {
              userImg.attr('src', defaultSrc);
            }
          });

          const userFullName = $(`<span>${user.firstName} ${user.lastName}</span>`);

          userImgContainer.append(userImg);
          userMeta.append(userImgContainer, userFullName);

          const followUnfollowBtn = $(`<button></button>`);

          if (user.isFollowing || (currentUserPublicId === userProfileId && type === `following`)) {
            followUnfollowBtn.text(`Unfollow`).addClass(`unfollow-btn`);
          } else {
            followUnfollowBtn.text(`Follow`).addClass(`follow-btn`);
          }
          userContainer.append(userMeta);
          if (currentUserPublicId && user.publicId !== currentUserPublicId) {
            followUnfollowBtn.data(`user-id`, user.publicId);
            userContainer.append(followUnfollowBtn);
          }

          userContainer.data(`user-id`, user.publicId);
          tabContent.append(userContainer);

        }
        const paginationControls = $(`<div class="pagination-controls ${type}-pagination"></div>`)
        tabContent.append(paginationControls);
        renderPagination(usersPage.pageNumber, usersPage.totalPages, paginationControls);
      },
      error: function (response) {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(`An error occurred while sending the request, please try again later`)
        }
      }
    });
  }

  $(`.profile-content`).on(`click`, `.follower-user-meta`, function () {
    const profileId = $(this).closest(`.follower-user-container`).data(`user-id`)
    window.location = `/users/${profileId}`;
  });

  $(`.profile-content`).on(`click`, `.following-user-meta`, function () {
    const profileId = $(this).closest(`.following-user-container`).data(`user-id`)
    window.location = `/users/${profileId}`;
  });

  function isNameValid(nameInput, type) {
    clearErrors(nameInput);

    if (nameInput.val().trim() === '') {
      showError(nameInput, `${type} cannot be empty.`);
      return false;
    }

    return true;
  }

  function isCurrentPasswordValid(currentPasswordInput) {
    clearPasswordError(currentPasswordInput)
    if (!currentPasswordInput.val().trim()) {
      showPasswordError(currentPasswordInput, `The current password is incorrect.`);
      return false;
    }
    return true;
  }

  function isNewPasswordValid(newPasswordInput) {
    clearPasswordError(newPasswordInput)
    if (newPasswordInput.val().trim().length < 8) {
      showPasswordError(newPasswordInput, 'Password must be at least 8 characters.');
      return false;
    }
    return true;
  }

  function isConfirmPasswordValid(confirmPasswordInput) {
    clearPasswordError(confirmPasswordInput)

    if ($(`.new-password-input`).val().trim() !== confirmPasswordInput.val().trim()) {
      showPasswordError(confirmPasswordInput, `Passwords do not match.`)
      return false;
    }
    if (confirmPasswordInput.val().trim().length === 0) {
      return false
    }
    return true;
  }

  $(`.cancel-modal-btn`).on(`click`, function () {

    $(`#edit-profile-modal`).addClass(`hidden`);

  });

  $(`.change-password-btn`).on(`click`, function () {

    if (window.innerWidth > 700) {
      $(`.modal-content`).css(`width`, `80%`);
    }

    setTimeout(function () {
      $(`#password-fields`).removeClass(`hidden`);
    }, 100);
  });

  $(`.cancel-change-password-btn`).on(`click`, function () {

    $(`#password-fields`).addClass(`hidden`);
    if (window.innerWidth > 700) {
      $(`.modal-content`).css(`width`, `40%`);
    }

  });

  $(`.toggle-password`).on(`click`, function () {
    const currentInput = $(this).closest(`.form-input`).find(`input`);

    $(this).toggleClass('bi-eye');

    if ($(this).hasClass(`bi-eye`)) {
      currentInput.attr(`type`, `text`);
    } else {
      currentInput.attr(`type`, `password`);
    }
  })


  function showPasswordError(inputField, message) {
    inputField.closest(`.form-input`).addClass(`error`);
    inputField.closest(`.form-group`).next(`.error-message`).text(message).css(`visibility`, `visible`);
  }

  function clearPasswordError(inputField) {
    inputField.closest(`.form-input`).removeClass(`error`);
    inputField.closest(`.form-group`).next(`.error-message`).css(`visibility`, `hidden`);
  }

  function showError(inputField, message) {
    inputField.addClass('error');
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `visible`).text(message);
  }

  function clearErrors(inputField) {
    inputField.removeClass('error');
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `hidden`);
  }
});
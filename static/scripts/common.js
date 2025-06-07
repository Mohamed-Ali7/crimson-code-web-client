const favIcon = $(`<link rel="icon" href="/static/images/favicon.png" type="image/png">`);
$(`head`).append(favIcon);
$(document).ready(async function () {

    const host = window.API_URL;

    const customErrorMessage = `An error occurred while sending the request, please try again later or contact support`;
    let isUserLoggedIn = true;

    if (!Cookies.get(`access_token`)) {
      isUserLoggedIn = await checkAuth();
    }

    if (!isUserLoggedIn) {
      $('.user-profile').hide();
      $(`.mobile-view-logout-btn`).hide();
      $(`.login-signup-btn`).css(`display`, `flex`);
    } else {
      $('.user-profile').show();
      $(`.publish-btn`).show();
    }

    async function loadCurrentUser() {
      let currentUser = localStorage.getItem(`user`);
      const accessToken = Cookies.get(`access_token`);

      if (currentUser) {
        return Promise.resolve(JSON.parse(currentUser));
      }

      return await $.ajax({
        method: "GET",
        url: `${host}/api/users/me`,
        headers: { 'Authorization': 'Bearer ' + accessToken }
      }).then((user) => {
        const localStorageUser = {
          publicId: user.publicId,
          profileImgUrl: user.profileImgUrl,
          firstName: user.firstName,
          lastName: user.lastName,
        }
        localStorage.setItem(`user`, JSON.stringify(localStorageUser));
        return localStorageUser;
      }).catch(function (response) {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(`An error occurred while sending the request, please try again later`)
        }
      });
    }

    $(`.logo`).on(`click`, function () {
      window.location = `/`;
    });

    async function loadTags() {
      let tags = sessionStorage.getItem(`tags`);
      if (tags) {
        return Promise.resolve(JSON.parse(tags));
      }

      return await $.ajax({
        method: `GET`,
        url: `${host}/api/tags?size=100000`,
        contentType: `application/json`
      }).then(function (data) {
        sessionStorage.setItem(`tags`, JSON.stringify(data.content));
        return data.content;
      }).catch(function (response) {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(customErrorMessage);
        }
        return [];
      });
    }

    if (isUserLoggedIn) {
      loadCurrentUser().then(user => {

        $(`.profile-details`).data(`user-id`, user.publicId);
        const profilePictureURL = $(`.profile-details .profile-pic img`);
        const userFullName = $(`.profile-details .user-name`);
        const downArrow = $(`<i class="fa fa-caret-down"></i>`);

        if (user.profileImgUrl) {
          profilePictureURL.attr(`src`, `${user.profileImgUrl}`);
        } else {
          profilePictureURL.attr(`src`, '/static/images/navbar_default_profile_pic.png');
        }

        profilePictureURL.on(`error`, function () {
          const defaultSrc = '/static/images/navbar_default_profile_pic.png';
          if ($(this).attr('src') !== defaultSrc) {
            $(this).attr('src', defaultSrc);
          }
        });

        userFullName.text(`${user.firstName} ${user.lastName}`);

        userFullName.append(downArrow);
      });
    }

    loadTags().then(tags => {
      tags.forEach(tag => {
        const AlltagCheckBoxes = $(`.tag-checkboxes`);

        const tagLabel = $(`<label class="tag-dropdown-item"></label>`);
        tagLabel.data('tag-name', tag.name.toLowerCase());

        const tagCheckBox = $(`<input type="checkbox">`);
        tagCheckBox.val(tag.name);

        tagLabel.append(tagCheckBox).append(tag.name);


        AlltagCheckBoxes.append(tagLabel);
      });
    });

    async function loadCategories() {
      let categories = sessionStorage.getItem(`categories`);
      if (categories) {
        return Promise.resolve(JSON.parse(categories));
      }

      return await $.ajax({
        method: `GET`,
        url: `${host}/api/categories?size=10000`,
        contentType: `application/json`
      }).then(function (data) {
        sessionStorage.setItem(`categories`, JSON.stringify(data.content));
        return data.content;
      }).catch(function (response) {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(customErrorMessage);
        }
        return [];
      });
    }

    loadCategories().then(categories => {
      categories.forEach(category => {
        const categoryDropdownList = $(`.category-dropdown`);
        const categoryItem = $(`<a class="category-item">${category.name}</a>`);
        const categoryDropdownListItem = $(`<li></li>`);

        categoryItem.data(`category-name`, category.name.toLowerCase());
        categoryItem.attr(`href`, `/posts?category=${encodeURIComponent(category.name.toLowerCase())}`)
        categoryItem.text(category.name);

        categoryDropdownListItem.append(categoryItem);

        categoryDropdownList.append(categoryDropdownListItem);
      })
    });

    const mainWrapper = $(`body main`);
    const navButtons = $(`.navbar-buttons`);
    const publishButton = $(`.publish-btn`);


    if (window.innerWidth <= 900) {
      navButtons.append(publishButton);
    }

    $(window).on(`resize`, function () {

      if (window.innerWidth > 900) {

        $(`.navbar-buttons`).css(`display`, `flex`);
        $(`.user-profile`).prepend(publishButton);

      } else {

        navButtons.append(publishButton)

      }
    });


    $(`.nav-left-buttons li`).on(`click`, function () {

      $(`.nav-left-buttons li`).not($(this)).removeClass(`active`);
      if (!$(this).hasClass(`viiew-search-btn`)) {
        $(`.search-container`).hide();
      }

    });

    const tagSearch = $(`.tag-search`);

    $(`#tag-dropdown-btn`).on(`click`, function () {
      $(`.tag-dropdown-content`).toggleClass(`open`);
      $(`#tag-dropdown-btn`).toggleClass(`active`);
      tagSearch.val(``)
    });

    $(`.view-search-btn`).on(`click`, function () {
      $(this).toggleClass(`active`);

      if (window.innerWidth <= 900) {
        $(`.navbar-buttons`).hide();
        $(`.menu-bar`).removeClass(`active`);
      }

      if ($(this).hasClass(`active`)) {
        $(`.search-container`).show();
        $(`.main-search-input`).focus();
      } else {
        $(`.search-container`).hide();
      }

    });

    $(`.close-search-btn`).on(`click`, function () {
      $(`.search-container`).hide();
      $(`.view-search-btn`).removeClass(`active`);
    });

    tagSearch.on(`keyup`, function () {

      const searchValue = $(this).val().trim().toLowerCase();

      const tagDropdownItems = document.querySelectorAll(`.tag-dropdown-item`);

      tagDropdownItems.forEach(item => {
        if (item.textContent.toLowerCase().startsWith(searchValue)) {
          item.classList.remove(`hide`);
        } else {
          item.classList.add(`hide`);
        }
      })
    });

    $(`.menu-bar`).on(`click`, function () {
      if (window.innerWidth <= 900) {
        $(this).toggleClass(`active`);
        if ($(this).hasClass(`active`)) {
          $(`.navbar-buttons`).css(`display`, `flex`);
        } else {
          $(`.navbar-buttons`).hide();
        }
      }
    });

    $(`.profile-details`).on(`click`, function () {
      if (window.innerWidth > 900) {
        $(this).toggleClass(`expand`);
        if ($(this).hasClass(`expand`)) {
          $(`.profile-dropdown`).show();
        } else {
          $(`.profile-dropdown`).hide();
        }
      } else {
        window.location = `/users/${decodeURIComponent($(this).data(`user-id`))}`;
      }
    });

    $(`.view-profile`).on(`click`, function () {
      currentUserId = $(this).closest(`.user-profile`).find(`.profile-details`).data(`user-id`);

      window.location = `/users/${currentUserId}`;
    });

    $(`.category-details`).on(`click`, function () {

      $(this).toggleClass(`active`);
      if ($(this).hasClass(`active`)) {
        $(`.category-dropdown`).show();
      } else {
        $(`.category-dropdown`).hide();
      }
    });

    $(document).on('click', function (e) {
      if ($('.user-profile').has(e.target).length === 0) {
        $('.profile-dropdown').hide();
        $('.profile-details').removeClass('expand');
      }
      if ($('.categories-btn').has(e.target).length === 0) {
        $(`.category-dropdown`).hide();
        $('.category-details').removeClass('active');
      }

      const tagDropdown = document.querySelector(`.tag-dropdown`);
      const tagDropdownBtn = document.querySelector(`#tag-dropdown-btn`);
      const dropdownContent = document.querySelector(`.tag-dropdown-content`);
      if (!tagDropdown.contains(e.target)) {
        dropdownContent.classList.remove(`open`);
        tagDropdownBtn.classList.remove(`active`);
      }

      if (window.innerWidth <= 900) {
        const navbarButtons = document.querySelector(`.navbar-buttons`);
        const menuBar = document.querySelector(`.menu-bar`);
        if (!navbarButtons.contains(e.target) && e.target !== menuBar) {
          menuBar.classList.remove(`active`);
          navbarButtons.style.display = `none`;
        }
      }

    });

    const mainSearchButton = $(`.search-container .fa-search`);
    mainSearchButton.on(`click`, function () {
      const searchQuery = $(`.main-search-input`).val().trim();

      let tags = [];

      const checkboxes = $(`.tag-dropdown-item input`).toArray();

      checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          tags.push(checkbox.value);
        }
      });

      tags = tags.map(tag => encodeURIComponent(tag));

      window.location = `/posts?search=${encodeURIComponent(searchQuery)}&tags=${tags.join(`,`)}`;

    });

    $(`.search-container .main-search-input`).on(`keyup`, function (e) {
      e.preventDefault();
      if (e.key === `Enter`) {
        mainSearchButton.click();
      }
    })

    $(`.logout-btn`).on(`click`, logout);
    $(`.mobile-view-logout-btn`).on(`click`, logout);

    function logout() {
      const accessToken = Cookies.get(`access_token`);
      const refreshToken = Cookies.get(`refresh_token`);

      const reqData = {
        refreshToken: refreshToken,
      };

      $(`#loading-spinner`).css(`display`, `flex`);
      $.ajax({
        method: `POST`,
        url: `${host}/api/auth/logout`,
        data: JSON.stringify(reqData),
        contentType: `application/json`,
        headers: { 'Authorization': `Bearer ${accessToken}` },
        success: function (data) {
          Cookies.remove(`access_token`);
          Cookies.remove(`refresh_token`);
          localStorage.removeItem(`user`);

          window.location = `/login`;
        },
        error: function (response) {
          $(`#loading-spinner`).hide();
          if (response.responseJSON) {
            console.error(response.responseJSON.message);
          } else {
            console.error(customErrorMessage);
          }
        }
      });
    }

    $(`.navbar-login-btn`).on(`click`, function () {
      window.location = `/login`;
    });

    $(`.navbar-signup-btn`).on(`click`, function () {
      window.location = `/sign-up`;
    });

    $(`.site-footer .footer-bottom p`).text(`© ${new Date().getFullYear()} Crimson Code. All rights reserved.`);

}); 
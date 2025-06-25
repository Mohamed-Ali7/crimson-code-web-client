$(document).ready(async function () {

  const host = window.API_URL;
  const accessToken = Cookies.get(`access_token`);

  const pathSegments = window.location.pathname.split(`/`).filter(Boolean);

  const postId = pathSegments[1];

  const isEditMode = postId && pathSegments[2] === `edit`;

  let isUserLoggedIn = true;

  if (!accessToken) {
    isUserLoggedIn = await checkAuth();
  }

  if (!isUserLoggedIn) {
    $(`#post-form`).hide();
    $(`.login-prompt`).show();
    $(`#loading-spinner`).hide();
    return;
  }

  let apiRequestUrl = `${host}/api/posts`;
  let apiRequestMethod = `POST`;

  if (isEditMode) {
    apiRequestUrl = `${host}/api/posts/${postId}`;
    apiRequestMethod = `PUT`;
  }

  function validateQuillContent(quill) {

    const forbidList = ['IMG', 'VIDEO', 'AUDIO', 'IFRAME', 'EMBED', 'OBJECT', 'SOURCE', 'PICTURE'];
    forbidList.forEach(el => {
      quill.clipboard.addMatcher(el, (node, delta) => {
        const Delta = Quill.import('delta')
        return new Delta().insert('')
      });
    });

    quill.root.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
    }, true);

    quill.root.addEventListener('dragover', function (e) {
      e.preventDefault();
    }, true);
  }

  const quill = new Quill('#editor', {
    theme: 'bubble',
    placeholder: 'Write your post here...',
    modules: {
      syntax: true,
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        [{ 'background': ['#f7ed94', '#b4e6ab', '#f28b82', false] }],
        ['bold'], ['italic'], ['underline'], ['code-block'],
        ['strike'], ['blockquote'],
        [{ list: 'ordered' }], [{ list: 'bullet' }],
        ['link']
      ]
    }
  });

  $(`.ql-editor`).addClass(`post-content`);

  const editor = $(`.ql-editor`);

  validateQuillContent(quill);

  let isFormDirty = false;
  let isProgrammaticChange = isEditMode;
  let isOriginalPostTitle = isEditMode;
  let isNavigatingInternally = false;
  let isSafeButton = false;

  if (window.innerWidth <= 900) {

    editor.on('keyup', () => {
      const isEmpty = editor.html() === `<p><br></p>`
      if (!isEmpty) {
        markFormAsDirty();
      }
      editor.toggleClass('ql-blank', isEmpty);
    });
  }

  function markFormAsDirty() {
    $(`.navbar button`).attr(`data-safety-check`, true);
    $(`.navbar .profile-details`).attr(`data-safety-check`, true);
    isFormDirty = true;
  }
  $(`#post-category`).on(`change`, function () {
    markFormAsDirty();
  });

  quill.on('text-change', () => {
    if (isProgrammaticChange) {
      isProgrammaticChange = false;
      return;
    }
    markFormAsDirty();
  });

  $(`.navbar`).on(`click`, `button`, formLeavingAlert);
  $(`a`).on(`click`, formLeavingAlert);
  $(`.profile-details`).on(`click`, formLeavingAlert);


  $(`.submit-section`).on(`click`, `button`, function () {
    isSafeButton = true;
  });

  window.addEventListener('beforeunload', function (e) {
    if (isFormDirty && !isNavigatingInternally && !isSafeButton) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  function formLeavingAlert(e) {
    let target = e.target.closest(`a, button`);

    if (!target) {
      target = e.target.closest(`.profile-details`);
      if (target && window.innerWidth > 900) {
        return;
      }
    }

    if (!target || !isFormDirty || target.closest(`.footer-social`)) {
      return;
    }

    e.preventDefault();
    const href = target.getAttribute('href');
    Swal.fire({
      title: 'Unsaved changes!',
      text: 'Are you sure you want to leave without saving?',
      icon: 'warning',
      showCancelButton: true,
      scrollbarPadding: false,
      confirmButtonText: 'Yes, leave',
      cancelButtonText: 'Stay here'
    }).then((result) => {
      if (result.isConfirmed) {
        isFormDirty = false;
        isNavigatingInternally = true;

        target.removeAttribute(`data-safety-check`);
        if (href) {
          window.location.href = href;
        } else {
          requestAnimationFrame(() => {
            target.click();
          });
        }
      }
    });
  }

  const existedTags = new Set();
  const selectedTags = new Set();

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

  const postCategoryDropdown = $(`.post-category-dropdown`);

  loadCategories().then(categoryList => {
    categoryList.forEach(category => {
      const categorySpan = $(`<span class="post-category-dropdown-item"></span>`);
      categorySpan.data(`category-id`, category.id);
      categorySpan.text(category.name);

      postCategoryDropdown.append(categorySpan);
    })

  });

  $(`.post-category-container`).on(`click`, function () {

    $(this).toggleClass(`expand`);

    if ($(this).hasClass(`expand`)) {
      $(`.post-category-dropdown`).show();
    } else {
      $(`.post-category-dropdown`).hide();
    }
  });

  $(document).on(`click`, `.post-category-dropdown-item`, function () {

    $(`.post-category-dropdown`).hide();
    $(`.post-category-container`).removeClass(`expand`)

    $(`#post-category`).val($(this).text()).trigger(`change`);
    clearErrors($(`#post-category`));
    $(`#post-category`).data(`category-id`, $(this).data(`category-id`));

  });

  $(document).on(`click`, function (e) {

    if (!$(`.post-category-group`).has(e.target).length) {
      $(`.post-category-dropdown`).hide();
      $(`.post-category-container`).removeClass(`expand`)
    }
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


  if (isEditMode) {
    $.ajax({
      method: `GET`,
      url: `${host}/api/posts/${postId}`,
      success: function (post) {
        const imagePreview = $(`#image-preview`);

        const cancelPostEditButton = $(`<button type="submit" class="cancel-post-edit-button">Cancel</button>`);

        $(`.submit-btn`).addClass(`save-post-update-button`).text(`Save Updates`);
        $(`.submit-section`).append(cancelPostEditButton);

        $('#post-title').val(post.title);
        $(`#post-title`).trigger(`input`)
        $(`.post-content`).html(post.content);

        const postCategory = $('#post-category');
        postCategory.val(post.category.name);
        postCategory.data(`category-id`, post.category.id);

        if (post.imageUrl) {

          imagePreview.html(`<img src="${post.imageUrl}" alt="Image Preview" />`);

        } else {
          imagePreview.html(`<img src="/static/images/default_post_thumbnail.png" alt="Image Preview" />`);
        }

        imagePreview.css(`padding`, 0);
        imagePreview.css(`border`, `none`)

        $(`#image-preview img`).on(`error`, function () {
          const defaultSrc = '/static/images/default_post_thumbnail.png';
          if ($(this).attr('src') !== defaultSrc) {
            $(this).attr('src', defaultSrc);
          }
        });

        post.tags.forEach(tag => {
          selectedTags.add(tag.name.toLowerCase());

          const tagElement = $(`
          <span class="existed-tag-item">
            ${tag.name.toLowerCase()}
            <button type="button" class="remove-tag">&times;</button>
          </span>
        `);
          $('#selected-tags').append(tagElement);
        });

        loadTags().then(sessionTagsList => {
          sessionTagsList.forEach(existedTag => {
            if (!selectedTags.has(existedTag.name.toLowerCase())) {
              addExistedTags(existedTag);
            }
          });
        });
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
  } else {
    $(`#loading-spinner`).hide();
    loadTags().then(tagList => {
      tagList.forEach(tag => addExistedTags(tag));
    });
  }

  $(document).on(`click`, `.save-post-update-button`, function (e) {
    e.preventDefault();

    Swal.fire({
      title: 'Save Changes?',
      text: "Are you sure you want to save your updates?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, save it!',
      cancelButtonText: 'No, cancel',
      scrollbarPadding: false
    }).then((result) => {
      if (result.isConfirmed) {
        $(`#post-form`).submit();
      } else {
        isSafeButton = false;
      }
    });

  });

  $(document).on('click', '.cancel-post-edit-button', function (e) {

    e.preventDefault();

    Swal.fire({
      title: 'Discard Changes?',
      text: "Any unsaved changes will be lost.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, discard',
      cancelButtonText: 'Go back',
      scrollbarPadding: false
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = `/posts/${postId}`;
      } else {
        isSafeButton = false;
      }
    });
  });

  function addExistedTags(tag) {

    existedTags.add(tag.name.toLowerCase());

    const existedPostTags = $(`.existed-post-tags`);

    const existedTagItem = $(`<span class="existed-tag-item"></span>`);

    existedTagItem.text(tag.name.toLowerCase());

    existedPostTags.append(existedTagItem);
  }

  $(`#tag-input`).on(`keyup`, function (e) {

    const searchValue = $(this).val().trim().toLowerCase();
    $(`#existed-post-tags .existed-tag-item`).each(function () {
      if ($(this).text().toLowerCase().startsWith(searchValue)) {
        $(this).removeClass(`hide`);
      } else {
        $(this).addClass(`hide`);
      }
    });
  });

  $('#tag-input').on('keydown', function (e) {

    if (e.key === 'Enter') {
      e.preventDefault();

      const inputVal = $(this).val().trim().toLowerCase();

      if (inputVal && !selectedTags.has(inputVal.toLowerCase()) && !existedTags.has(inputVal.toLowerCase())) {
        selectedTags.add(inputVal.toLowerCase());

        $(`#existed-post-tags .existed-tag-item`).each(function () {
          $(this).removeClass(`hide`);
        });

        const tagElement = $(`
          <span class="selected-tag-item">
            ${inputVal}
            <button type="button" class="remove-tag">&times;</button>
          </span>
        `);

        tagElement.find('.remove-tag').on('click', function () {
          tagElement.remove();
          selectedTags.delete(inputVal.toLowerCase());
        });

        $('#selected-tags').append(tagElement);
        $(this).val(``);

        markFormAsDirty();
      }
    }
  });

  $(`#existed-post-tags`).on(`click`, `.existed-tag-item`, function () {
    const tagValue = $(this).text().trim().toLowerCase();

    const removeTagButton = $(`<button type="button" class="remove-tag">&times;</button>`);

    $(this).append(removeTagButton);

    $('#selected-tags').append($(this));

    selectedTags.add(tagValue);

    markFormAsDirty();
  });

  $(`#selected-tags`).on(`click`, `.existed-tag-item .remove-tag`, function () {

    const existedTag = $(this).closest(`.existed-tag-item`);
    $(this).remove();

    const tagValue = existedTag.text().trim().toLowerCase();

    $('#existed-post-tags').prepend(existedTag);

    selectedTags.delete(tagValue);

    markFormAsDirty();
  });




  $(`.form-input`).on(`blur`, function () {

    if ($(this).val().trim()) {
      clearErrors($(this));
    }
  });

  const imageFileInput = $("#post-image");
  const imagePreview = $("#image-preview");

  imagePreview.on("click", function () { imageFileInput.click() });

  imagePreview.on("dragover", function (e) {
    e.preventDefault();
    imagePreview.css(`border-color`, `#007BFF`);
  });

  imagePreview.on("dragleave", function () {
    imagePreview.css(`border-color`, `#ccc`);
  });

  imagePreview.on("drop", function (e) {
    e.preventDefault();
    imagePreview.css(`border-color`, `#ccc`);
    const file = e.originalEvent.dataTransfer.files[0];
    if (file) {
      showImagePreview(file);
      imageFileInput.prop(`files`, e.originalEvent.dataTransfer.files);
    }
  });

  imageFileInput.on("change", function () {
    const file = imageFileInput.prop(`files`)[0];
    if (file) {
      showImagePreview(file);
    }
  });

  function showImagePreview(file) {
    const reader = new FileReader();
    const isValid = isPostImageValid(file);
    if (isValid) {
      reader.onload = function (e) {
        imagePreview.html(`<img src="${e.target.result}" alt="Image Preview" />`);
        imagePreview.css(`padding`, 0);
        imagePreview.css(`border`, `none`)
      };
      reader.readAsDataURL(file);
    }

  }

  $(`#post-title`).on('input', function () {
    resizeTextarea(this);

    if (!isOriginalPostTitle) {
      markFormAsDirty();
    } else {
      isOriginalPostTitle = false;
    }
  });

  const autoResizeTextareas = $('#post-title');

  $(window).on('resize', function () {
    autoResizeTextareas.each(function () {
      resizeTextarea(this);
    })
  });

  function resizeTextarea(textarea) {

    const scrollTop = window.scrollY;
    textarea.style.height = '5rem';
    textarea.style.height = textarea.scrollHeight + 'px';
    window.scrollTo({ top: scrollTop });

  }

  $(`#post-form`).on(`submit`, function (e) {

    e.preventDefault();

    const postTitleInput = $(`#post-title`);
    const postContentInput = $(`.ql-editor`);
    const postCateogryInput = $(`#post-category`);

    if (!isPostTitleValid(postTitleInput) || !isPostContentValid(postContentInput) ||
      !isPostCategoryValid(postCateogryInput)) {
      return;
    }

    const formData = new FormData();

    const tags = [];

    selectedTags.forEach(tag => {
      tags.push(tag);
    });

    $(`.ql-code-block-container select.ql-ui`).remove();

    const cleanHtmlContent = DOMPurify.sanitize(postContentInput.html(), {
      FORBID_TAGS: ['script', 'iframe', 'video', 'audio', 'embed', 'object', 'img', 'source']
    });

    const postData = {
      title: postTitleInput.val().trim(),
      content: cleanHtmlContent,
      categoryId: postCateogryInput.data(`category-id`),
      tags: tags,
    }

    formData.append(`post`, new Blob([JSON.stringify(postData)], { type: 'application/json' }));

    const postImageElement = $(`#post-image`);

    const postImage = postImageElement.prop(`files`)[0];

    if (postImage) {
      formData.append(`postImage`, postImage);
    }

    $(`.submit-btn`).prop(`disabled`, true);

    $(`#loading-spinner`).show();

    $.ajax({
      method: apiRequestMethod,
      url: apiRequestUrl,
      data: formData,
      processData: false,
      contentType: false,
      headers: { 'Authorization': 'Bearer ' + accessToken },
      success: function (post) {
        sessionStorage.removeItem(`tags`);
        window.location = `/posts/${post.id}`;
      },
      error: function (response) {
        $(`.submit-btn`).prop(`disabled`, false);
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

  });



  function showError(inputField, message) {
    inputField.addClass('error');
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `visible`).text(message);

    let element = document.querySelector(`#${inputField.attr('id')}`);
    if (!element && inputField.hasClass(`ql-editor`)) {
      element = document.querySelector(`.ql-editor`);
    }

    const y = element.getBoundingClientRect().top + window.pageYOffset - 50;

    setTimeout(() => {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 200);
  }

  function clearErrors(inputField) {
    inputField.removeClass('error');
    inputField.closest(`.form-group`).next('.error-message').css(`visibility`, `hidden`);
  }

  function isPostTitleValid(titleInput) {
    clearErrors(titleInput);

    if (titleInput.val().trim() === '') {
      showError(titleInput, `Post title cannot be empty.`);
      return false;
    } else if (titleInput.val().trim().length > 250) {
      showError(titleInput, `Post title cannot be more than 250 characters`);
      return false;
    }

    return true;
  }

  function isPostContentValid(contentInput) {
    clearErrors(contentInput);

    if (contentInput.html().trim() === '<p><br></p>') {
      showError(contentInput, `Post Content cannot be empty.`);
      return false;
    }

    return true;
  }

  function isPostCategoryValid(categoryInput) {
    clearErrors(categoryInput);

    if (categoryInput.val().trim() === '') {
      showError(categoryInput, `Category is required`);
      return false;
    }

    return true;
  }

  function isPostImageValid(image) {
    if (image.size > 2 * 1024 * 1024) { // 2MB
      $(`.image-preview`).addClass(`error`);
      $(`.image-upload-wrapper`).next(`.error-message`).css(`visibility`, `visible`)
        .text(`File size exceeds 2MB limit. Please choose a smaller image.`);
      return false;
    }

    $(`.image-preview`).removeClass(`error`);
    $(`.image-upload-wrapper`).next(`.error-message`).css(`visibility`, `hidden`);
    return true;
  }

});
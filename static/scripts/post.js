$(document).ready(async function () {

  const host = window.API_URL;

  const pathSegments = window.location.pathname.split(`/`).filter(Boolean);

  const postId = pathSegments[0] === `posts` && pathSegments[1] ? pathSegments[1] : null;

  let accessToken = Cookies.get(`access_token`);

  let currentUserPublicId;
  let isAdmin = false;

  const containsAlphabet = /[a-zA-Z]/.test(postId);

  if (!postId || containsAlphabet) {
    window.location = `/not-found`;
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

  const quillInitializer = {
    theme: 'bubble',
    placeholder: 'Write your comment here...',
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
  }

  const commentQuill = new Quill('#editor', quillInitializer);

  validateQuillContent(commentQuill);

  $(`#editor .ql-editor`).addClass(`comment-textarea`);

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
  } else {
    $(`.comment-form`).hide();
    $(`.login-message`).show();
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

  $(window).on(`resize`, function () {
    if (window.innerWidth > 700) {
      $(`.comment-buttons`).css(`display`, `flex`);
    }
  })

  $(document).on('click', '.comment-dropdown-button', function (e) {

    const button = $(this);
    const commentButtonsElement = button.siblings('.comment-buttons');

    $('.comment-buttons').not(commentButtonsElement).hide();
    $('.comment-dropdown-button').not(button).removeClass('active');

    button.toggleClass(`active`);

    if (button.hasClass(`active`)) {
      commentButtonsElement.css(`display`, `flex`);
    } else {
      commentButtonsElement.hide()
    }

  });

  $(document).on('click', function (e) {

    if (window.innerWidth <= 700) {
      if (!$('.comment-buttons-container').has(e.target).length) {
        $('.comment-buttons').hide();
        $('.comment-dropdown-button').removeClass('active');
      }
    }
  });

  $.ajax({
    method: `GET`,
    url: `${host}/api/posts/${postId}`,
    success: function (post) {
      $('.post-title').text(post.title);
      $('.post-content').html(post.content);
      const user = post.user;

      $('.post-author-name').text(`${user.firstName} ${user.lastName}`).data(`user-id`, user.publicId);

      $(`.post-author-box`).data(`user-id`, user.publicId);

      const userAvatar = $('.post-author-avatar');

      if (user.profileImgUrl) {
        userAvatar.attr(`src`, `${user.profileImgUrl}`);
      } else {
        userAvatar.attr(`src`, '/static/images/default_profile_pic.png');
      }

      userAvatar.on(`error`, function () {
        const defaultSrc = '/static/images/default_profile_pic.png';
        if ($(this).attr('src') !== defaultSrc) {
          $(this).attr('src', defaultSrc);
        }
      });

      userAvatar.data(`user-id`, user.publicId);
      const date = new Date(post.createdAt);
      $('.post-date').text(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

      const postCategory = $('.post-category');
      postCategory.text(post.category.name);
      postCategory.data(`category-name`, post.category.name.toLowerCase());

      if (post.imageUrl) {
        $('.post-image').attr('src', `${post.imageUrl}`);
      } else {
        $('.post-image').attr('src', '/static/images/default_post_thumbnail.png');
      }

      $('.post-image').on(`error`, function () {
        const defaultSrc = '/static/images/default_post_thumbnail.png';
        if ($(this).attr('src') !== defaultSrc) {
          $(this).attr('src', defaultSrc);
        }
      });

      post.tags.forEach(tag => {
        const tagElement = $(`<span class="post-tag">${tag.name.toLowerCase()}</span>`);
        tagElement.data(`tag-name`, tag.name.toLowerCase());
        $('.tag-list').append(tagElement);
      });

      if (post.user.publicId === currentUserPublicId || isAdmin) {
        $(`.post-action-buttons`).css(`display`, `flex`);
      }

      loadComments(1);
    },
    error: function (response) {
      if (response.status === 404) {
        window.location = `/not-found`;
      } else {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(`An error occurred while sending the request, please try again later`)
        }
      }
    },
    complete: function () {
      $(`#loading-spinner`).hide();
    }
  });

  $(`.delete-post-button`).on(`click`, function (e) {

    e.preventDefault();

    Swal.fire({
      title: 'Delete this post?',
      text: "This action is irreversible. Are you sure?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, Cancel',
      scrollbarPadding: false
    }).then((result) => {
      if (result.isConfirmed) {

        $(this).prop(`disabled`, true);
        $(`#loading-spinner`).show();

        $.ajax({
          method: `DELETE`,
          url: `${host}/api/posts/${postId}`,
          headers: { Authorization: 'Bearer ' + accessToken },
          success: function () {
            window.location = `/home`;
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
            $(this).prop(`disabled`, false);
          }
        });
      }
    });
  });

  function loadComments(page) {
    const commentsSize = 6;
    $.ajax({
      method: `GET`,
      url: `${host}/api/posts/${postId}/comments?page=${page}&size=${commentsSize}`,
      success: function (commentsPage) {
        $(`.comments-list`).empty();

        const comments = commentsPage.content;

        comments.forEach(comment => {

          const CreatedComment = createComment(comment, currentUserPublicId);

          $(`.comments-list`).append(CreatedComment);
        });

        renderCommentsPagination(commentsPage.pageNumber, commentsPage.totalPages)
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

  $(document).on('click', '.pagination-controls button', function () {
    loadComments($(this).text());
    document.querySelector('#comments-section').scrollIntoView({
      behavior: 'smooth'
    });
  });

  function createComment(comment, currentUserId) {
    const commentWrapper = $(`<div class="comment-wrapper"></div>`);
    commentWrapper.data(`comment-id`, comment.id);

    const commentAuthor = comment.user;

    const commentMeta = $('<div class="comment-meta"></div>');
    const commentAuthorBox = $('<div class="comment-author-box"></div>');
    commentAuthorBox.data(`user-id`, commentAuthor.publicId);

    const commentButtonsConatiner = $('<div class="comment-buttons-container"></div>');

    const commentButtons = $('<div class="comment-buttons"></div>');
    const commentDropdownButton = $(`<i class="fas fa-ellipsis-h comment-dropdown-button"></i>`)

    const editCommentButton = $('<button class="edit-comment-button"><i class="far fa-edit"></i>Edit</button>');
    const deleteCommentButton = $('<button class="delete-comment-button"><i class="fas fa-trash-alt"></i>Delete</button>');

    const commentAuthorName = $('<div class="comment-author-name"></div>');
    commentAuthorName.text(`${commentAuthor.firstName} ${commentAuthor.lastName}`);
    commentAuthorName.data(`user-id`, commentAuthor.publicId);

    const commentAuthorAvatar = $('<img class="comment-author-avatar"/>');
    commentAuthorAvatar.data(`user-id`, commentAuthor.publicId)

    if (commentAuthor.profileImgUrl) {
      commentAuthorAvatar.attr(`src`, `${commentAuthor.profileImgUrl}`);
    } else {
      commentAuthorAvatar.attr(`src`, '/static/images/default_profile_pic.png');
    }

    commentAuthorAvatar.on(`error`, function () {
      const defaultSrc = '/static/images/default_profile_pic.png';
      if ($(this).attr('src') !== defaultSrc) {
        $(this).attr('src', defaultSrc);
      }
    });

    const commentDate = $(`<span class="comment-date"></span>`);

    const localCommentDate = new Date(comment.createdAt);
    commentDate.text(localCommentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

    commentAuthorBox.append(commentAuthorAvatar, commentAuthorName, commentDate);

    const commentContent = $('<div class="comment-content ql-editor"></div>').html(comment.content);

    commentMeta.append(commentAuthorBox);

    if (currentUserId === commentAuthor.publicId) {
      commentButtons.append(editCommentButton, deleteCommentButton)
      commentButtonsConatiner.append(commentDropdownButton, commentButtons)
      commentMeta.append(commentButtonsConatiner);
    }

    commentWrapper.append(commentMeta, commentContent);
    return commentWrapper;
  }

  $(`.comment-form`).on(`submit`, function (e) {
    e.preventDefault();

    const commentInput = $(`.comment-textarea`);
    const commentInputValue = $(`.comment-textarea`).html().trim();

    if (!commentInputValue || commentInputValue === `<p><br></p>`) {
      return;
    }

    $(`.comment-textarea .ql-code-block-container select.ql-ui`).remove();

    const cleanHtmlContent = DOMPurify.sanitize(commentInput.html().trim(), {
      FORBID_TAGS: ['script', 'iframe', 'video', 'audio', 'embed', 'object', 'img', 'source']
    });

    $(`.submit-comment`).prop(`disabled`, true);

    $(`#loading-spinner`).show();

    $.ajax({
      method: `POST`,
      url: `${host}/api/posts/${postId}/comments`,
      data: JSON.stringify({ content: cleanHtmlContent }),
      contentType: `application/json`,
      headers: { 'Authorization': 'Bearer ' + accessToken },
      success: function (comment) {
        $(`.comment-textarea`).text(``);
        const newComment = createComment(comment, currentUserPublicId);
        $(`.comments-list`).prepend(newComment);
      },
      error: function (response) {
        if (response.responseJSON) {
          console.error(response.responseJSON.message);
        } else {
          console.error(`An error occurred while sending the request, please try again later`)
        }
      },
      complete: function () {
        $(`.submit-comment`).prop(`disabled`, false);
        $(`#loading-spinner`).hide();
      }
    });

  });

  $(document).on(`click`, `.edit-post-button`, function (e) {

    window.location = `/posts/${postId}/edit`
  });

  $(document).on(`click`, `.edit-comment-button`, function (e) {

    $('.comment-buttons button').prop('disabled', true);

    const currentComment = $(this).closest(`.comment-wrapper`);
    const currentCommentContent = currentComment.find(`.comment-content`);
    const currentCommentContentHTML = currentCommentContent.html();
    currentCommentContent.hide();
    currentComment.find(`.comment-buttons`).addClass(`hide`);

    const updateCommentForm = $(`<form class="update-comment-form"></form>`);
    const updateCommentTextarea = $(`<div id="update-comment-editor"></div>`);
    const updateCommentButtons = $(`<div class="update-comment-buttons"></div>`);
    const saveCommentButton = $(`<button type="button" class="save-comment-button">Save</button>`);
    const cancelEditButton = $(`<button type="button" class="cancel-comment-edit-button">Cancel</button>`);

    updateCommentButtons.append(saveCommentButton, cancelEditButton);
    updateCommentForm.append(updateCommentTextarea, updateCommentButtons);

    currentComment.append(updateCommentForm);

    updateCommentTextarea.focus();

    const updateCommentQuill = new Quill('#update-comment-editor', quillInitializer);

    updateCommentQuill.root.innerHTML = currentCommentContentHTML

    $(`#update-comment-editor .ql-editor`).addClass(`update-comment-textarea`);

    validateQuillContent(updateCommentQuill);
  });

  $(document).on(`click`, `.cancel-comment-edit-button`, function (e) {

    e.preventDefault();

    const cancelCommentEdit = $(this);

    Swal.fire({
      title: 'Discard Changes?',
      text: "Are you sure you want to discard your changes?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, discard',
      cancelButtonText: 'Go back',
      scrollbarPadding: false
    }).then((result) => {
      if (result.isConfirmed) {
        cancelCommentEdit.closest(`.comment-wrapper`).find(`.comment-content`).show();
        cancelCommentEdit.closest(`.comment-wrapper`).find(`.comment-buttons`).removeClass(`hide`);

        $('.comment-buttons button').prop('disabled', false);
        cancelCommentEdit.closest(`.update-comment-form`).remove();
      }
    });
  });

  $(document).on(`click`, `.save-comment-button`, function (e) {

    e.preventDefault();

    const currentUpdateCommentform = $(this).closest(`.update-comment-form`);
    const updatedCommentContentInput = $(`.update-comment-textarea`);
    const currentComment = $(this).closest(`.comment-wrapper`);
    const currentCommentId = currentComment.data(`comment-id`);

    $(`.update-comment-textarea .ql-code-block-container select.ql-ui`).remove();

    const cleanHtmlContent = DOMPurify.sanitize(updatedCommentContentInput.html().trim(), {
      FORBID_TAGS: ['script', 'iframe', 'video', 'audio', 'embed', 'object', 'img', 'source']
    });

    if (!cleanHtmlContent) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Comment!',
        text: 'Please write something before saving.',
        confirmButtonColor: '#3085d6',
        scrollbarPadding: false
      });
      return;
    }


    Swal.fire({
      title: 'Save Changes?',
      text: 'Are you sure you want to save this comment?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, save it!',
      cancelButtonText: 'No, Cancel',
      scrollbarPadding: false
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          method: `PUT`,
          url: `${host}/api/posts/${postId}/comments/${currentCommentId}`,
          data: JSON.stringify({ content: cleanHtmlContent }),
          contentType: `application/json`,
          headers: { Authorization: 'Bearer ' + accessToken },
          success: function (newComment) {

            currentUpdateCommentform.remove();

            currentComment.find(`.comment-buttons`).removeClass(`hide`);
            $(`.comment-buttons button`).prop('disabled', false)

            currentComment.find(`.comment-content`).html(newComment.content).show();

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
    });
  });

  $(document).on(`click`, `.delete-comment-button`, function (e) {

    e.preventDefault();

    const currentComment = $(this).closest(`.comment-wrapper`);
    const currentCommentId = currentComment.data(`comment-id`);

    Swal.fire({
      title: 'Are you sure?',
      text: "This comment will be permanently deleted!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      scrollbarPadding: false
    }).then((result) => {
      if (result.isConfirmed) {
        $(this).prop(`disabled`, true);
        $(`#loading-spinner`).show();
        $.ajax({
          method: `DELETE`,
          url: `${host}/api/posts/${postId}/comments/${currentCommentId}`,
          headers: { Authorization: 'Bearer ' + accessToken },
          success: function (data) {
            currentComment.remove();
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'The comment has been removed.',
              timer: 1100,
              showConfirmButton: false,
              scrollbarPadding: false
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
            $(this).prop(`disabled`, false);
            $(`#loading-spinner`).hide();
          }
        });
      }
    });
  });

  $(document).on(`click`, `.post-author-name`, function () {
    const authorId = $(this).closest(`.post-author-box`).data(`user-id`);
    window.location = `/users/${encodeURIComponent(authorId)}`;
  });

  $(document).on(`click`, `.post-author-avatar`, function () {
    const authorId = $(this).closest(`.post-author-box`).data(`user-id`);
    window.location = `/users/${encodeURIComponent(authorId)}`;
  });

  $(document).on(`click`, `.comment-author-name`, function () {
    const authorId = $(this).closest(`.comment-author-box`).data(`user-id`);
    window.location = `/users/${encodeURIComponent(authorId)}`;
  });

  $(document).on(`click`, `.comment-author-avatar`, function () {
    const authorId = $(this).closest(`.comment-author-box`).data(`user-id`);
    window.location = `/users/${encodeURIComponent(authorId)}`;
  });


  $(`.post-image`).on(`click`, function () {
    window.open($(this).attr('src'), '_blank');
  });

  $(`.post-content`).on(`click`, `img`, function () {
    window.open($(this).attr('src'), '_blank');
  });

  $(`.post-category`).on(`click`, function () {
    const encodedCategory = encodeURIComponent($(this).data(`category-name`));
    window.location = `/posts?category=${encodedCategory}`;
  });

  $(document).on(`click`, `.tag-meta-section .tag-list .post-tag`, function () {
    const encodedTag = encodeURIComponent($(this).data(`tag-name`));
    window.location = `/posts?tag=${encodedTag}`;
  });

  function renderCommentsPagination(currentPage, totalPages) {

    const totalButtons = 5;
    const pages = [];

    const paginationControls = $(`.pagination-controls`);

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

});
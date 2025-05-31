$(document).ready(async function () {

  const host = window.API_URL;

  let requestURL = `${host}/api/posts?`;

  const urlParams = new URLSearchParams(window.location.search);

  const searchParam = urlParams.get(`search`);
  const searchTagsParam = urlParams.get(`tags`);

  const tagParam = urlParams.get(`tag`);
  const categoryParam = urlParams.get(`category`);

  if (searchParam || searchTagsParam) {
    const encodedSearchParam = encodeURIComponent(searchParam);
    const encodedSearchTagsParam =  encodeURIComponent(searchTagsParam)
    requestURL = `${host}/api/posts/search?query=${(encodedSearchParam)}&tags=${encodedSearchTagsParam}&`;
  } else if (tagParam) {
    requestURL = `${host}/api/tags/${encodeURIComponent(tagParam)}/posts?`;
  } else if (categoryParam) {
    requestURL = `${host}/api/categories/${encodeURIComponent(categoryParam)}/posts?`;
  }

  const page = urlParams.get(`page`) ? urlParams.get(`page`) : 1;
  const size = urlParams.get(`size`) ? urlParams.get(`size`) : 9;
  const sortBy = urlParams.get(`sort_by`) ? urlParams.get(`sort_by`) : `createdAt`;
  const sortDir = urlParams.get(`sort_dir`) ? urlParams.get(`sort_dir`) : `desc`;

  $.ajax({
    method: `GET`,
    url: `${requestURL}page=${page}&size=${size}&sort_by=${sortBy}&sort_dir=${sortDir}`,
    success: function (postsPage) {
      postsPage.content.forEach(post => {

        const postCard = $(`<div class="post-card"></div>`).data(`post-id`, post.id);

        const postImageContainer = $(`<div class="post-image-container"></div>`);
        const postImage = $(`<img class="post-image" alt="Post Thumbnail">`);

        postImageContainer.append(postImage);
        if (post.imageUrl) {
          postImage.attr(`src`, `${host}${post.imageUrl}`);
        } else {
          postImage.attr(`src`, '/static/images/default_post_thumbnail.png');
        }

        postImage.on(`error`, function () {
          const defaultSrc = '/static/images/default_post_thumbnail.png';
          if ($(this).attr('src') !== defaultSrc) {
            $(this).attr('src', defaultSrc);
          }
        });

        const postContent = $(`<div class="post-content"></div>`);

        const postTitle = $(`<h2 class="post-title"></h2>`).text(post.title);
        const postExcerpt = $(`<p class="post-excerpt"></p>`).text(post.content);

        const postMeta = $(`<div class="post-meta"></div>`);
        const authorInfoContainer = $(`<div class="author-info-container"></div>`);

        const authorAvatar = $(`<img class="author-avatar">`);
        const authorInfo = $(`<div class="author-info"></div>`);
        const authorName = $(`<span class="author-name"></span>`)
        const postDate = $(`<span class="post-date"></span>`).text(formatDate(post.createdAt));

        const user = post.user;

        authorInfoContainer.data(`user-id`, user.publicId);

        if (user.profileImgUrl) {
          authorAvatar.attr(`src`, `${host}${user.profileImgUrl}`);
        } else {
          authorAvatar.attr(`src`, '/static/images/default_profile_pic.png');
        }

        authorAvatar.on(`error`, function () {
          const defaultSrc = '/static/images/default_profile_pic.png';
          if ($(this).attr('src') !== defaultSrc) {
            $(this).attr('src', defaultSrc);
          }
        });

        authorName.text(`${user.firstName} ${user.lastName}`);

        const postCategory = $(`<span class="post-category"></span>`);

        const category = post.category;
        postCategory.data(`category-name`, category.name.toLowerCase());
        postCategory.text(category.name);

        const postTags = $(`<div class="post-tags-list"></div>`);

        post.tags.forEach(tag => {
          const tagSpan = $(`<span class="post-tag">${tag.name.toLowerCase()}</span>`)
            .data(`tag-name`, tag.name.toLowerCase());

          postTags.append(tagSpan);
        })

        const readMoreLink = $(`<a href="/posts/${post.id}" class="read-more">Read More</a>`);

        postCard.append(postImageContainer);
        postContent.append(postTitle, postExcerpt);
        authorInfo.append(authorName, postDate);

        authorInfoContainer.append(authorAvatar, authorInfo);
        postMeta.append(authorInfoContainer, postCategory);
        postContent.append(postMeta, postTags, readMoreLink);
        postCard.append(postContent);

        $(`.post-cards-wrapper`).append(postCard);
      });

      renderPagination(postsPage.pageNumber, postsPage.totalPages);
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

  $(document).on(`click`, `.author-name`, showUser);

  $(document).on(`click`, `.author-avatar`, showUser);

  function showUser() {
    const authorId = $(this).closest(`.author-info-container`).data(`user-id`);

    const encodedAuthorId = encodeURIComponent(authorId);
    window.location = `/users/${encodedAuthorId}`;
  }

  $(document).on(`click`, `.post-category`, function () {
    const encodedCategory = encodeURIComponent($(this).data(`category-name`));
    window.location = `/posts?category=${encodedCategory}`;
  });

  $(document).on(`click`, `.post-tags-list .post-tag`, function () {
    const encodedTag = encodeURIComponent($(this).data(`tag-name`));
    window.location = `/posts?tag=${encodedTag}`;
  });

  $(document).on('click', '.pagination-controls button', function () {
    if (searchParam || searchTagsParam) {
      window.location = `/posts?search=${searchParam}&tags=${searchTagsParam}&page=${$(this).text()}`;
    } else if (tagParam) {
      window.location = `/posts?tag=${tagParam}&page=${$(this).text()}`;
    } else if (categoryParam) {
      window.location = `/posts?category=${categoryParam}&page=${$(this).text()}`;
    }
    else {
      window.location = `/home?page=${$(this).text()}`;
    }
  });

  function renderPagination(currentPage, totalPages) {

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

  function formatDate(isoDate) {
    const date = new Date(isoDate);

    return date.toLocaleDateString(`en-US`, {
      year: `numeric`,
      month: `long`,
      day: `numeric`,
    })
  }
});
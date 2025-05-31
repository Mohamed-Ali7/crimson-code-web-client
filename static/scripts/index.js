$(document).ready(async function () {

  const host = window.API_URL;

  $.ajax({
    method: `GET`,
    url: `${host}/api/posts?sort_dir=asc&size=2`,
    success: function (postPage) {

      const posts = postPage.content;

      for (let post of posts) {
        const postCard = $(`<div class="post-card"></div>`).data(`post-id`, post.id);

        const postImage = $(`<img class="post-image" alt="Post Thumbnail">`);

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

        const postTitle = $(`<h3 class="post-title"></h3>`).text(post.title);
        const postExcerpt = $(`<p class="post-excerpt"></p>`).text(post.content);

        const readMoreLink = $(`<a href="/posts/${post.id}" class="read-more">Read More</a>`);

        postContent.append(postTitle, postExcerpt, readMoreLink)
        postCard.append(postImage, postContent);

        $(`.post-grid`).append(postCard);
      }

    }
  });
});
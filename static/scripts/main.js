$(document).ready(function () {
  const host = window.API_URL;
  let isRefreshing = false;
  let pendingRequests = [];
  let refreshTimeout = null;

  $.ajaxSetup({
    statusCode: {
      401: function (xhr) {
        $(`#loading-spinner`).css(`display`, `flex`);

        const refreshToken = Cookies.get('refresh_token');

        if (!refreshToken) {
          Cookies.remove(`access_token`, { path: '/' });
          if (!window.location.pathname.includes(`login`)) {
            $(`#loading-spinner`).hide();

            Swal.fire({
              title: 'Session Expired',
              text: 'Your session has expired. Do you want to login again?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Yes, login',
              cancelButtonText: 'Stay here',
              scrollbarPadding: false
            }).then((result) => {
              if (result.isConfirmed) {
                window.location = '/login';
              } else {
                window.location.reload();
              }
            });
          }
          return;
        }

        pendingRequests.push(xhr._originalSettings);
        if (!isRefreshing) {
          isRefreshing = true;
          checkAuth(false).then((success) => {
            if (success) {

              if (refreshTimeout) clearTimeout(refreshTimeout);

              refreshTimeout = setTimeout(() => {
                pendingRequests.forEach(req => {
                  req.headers = req.headers || {};
                  req.headers.Authorization = 'Bearer ' + Cookies.get(`access_token`);
                  $.ajax(req)
                });
                pendingRequests = [];
              }, 100);
              $(`#loading-spinner`).hide();
              isRefreshing = false;
            } else {
              $(`#loading-spinner`).hide();
              localStorage.removeItem(`user`);

              pendingRequests = [];

              Cookies.remove('access_token', { path: '/' });
              Cookies.remove('refresh_token', { path: '/' });

              if (!window.location.pathname.includes(`login`)) {
                Swal.fire({
                  title: 'Session Expired',
                  text: 'Your session has expired. Do you want to login again?',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Yes, login',
                  cancelButtonText: 'Stay here',
                  scrollbarPadding: false
                }).then((result) => {
                  if (result.isConfirmed) {
                    window.location = '/login';
                  } else {
                    window.location.reload();
                  }
                });
              }
            }
          });
        }
        $(`#loading-spinner`).hide();
      },
      403: function (xhr) {
        if (xhr.responseJSON) {
          if (!window.location.pathname.includes(`login`)) {
            alert(xhr.responseJSON.message);
          }
        }
        return;
      },
      404: function (xhr) {
        if (!window.location.pathname.includes(`index`)) {
          window.location = '/not-found'
        }
      }
    },
    beforeSend: function (xhr, settings) {

      if (!settings.url.includes(`/auth/refresh`)) {
        xhr._originalSettings = settings;
        const accessToken = Cookies.get('access_token');

        if (accessToken) {
          xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        }
      }

    }
  });

  async function checkAuth(checkForAccessToken = true) {
    const refreshToken = Cookies.get('refresh_token');

    if (checkForAccessToken) {
      if (Cookies.get(`access_token`)) {
        return true;
      }
    }
    if (!refreshToken) {
      return false;
    }

    return await $.ajax({
      type: 'GET',
      url: `${host}/api/auth/refresh`,
      headers: { 'Authorization': 'Bearer ' + refreshToken }
    }).then((data) => {

      const newAccessToken = data.accessToken;
      const payload = decodeJwt(newAccessToken);
      const expiresAt = new Date(payload.exp * 1000);

      Cookies.set('access_token', newAccessToken, { 'expires': expiresAt, path: `/` });

      return true;
    }).catch(() => {
      localStorage.removeItem(`user`);
      Cookies.remove('refresh_token', { path: '/' });
      return false;
    });
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

  window.checkAuth = checkAuth;
});
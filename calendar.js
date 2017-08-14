const logAndReturn = args => {
  console.log(args);
  return args;
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toggleTips(shouldHideTips) {
  localStorage.setItem('hideTips', JSON.stringify(shouldHideTips));
  $(document.body).toggleClass('hide-tips', shouldHideTips);
}

// Haha, fake it that the beginning of the day is when MF posts their WOD!!
moment.tz.setDefault('Atlantic/Cape_Verde');

const getContents = (url, attemptNumber = 1) => {
  return $.ajax(url).catch(err => {
    if (attemptNumber <= 3) {
      return delay(1500).then(() => (getContents(url, attemptNumber + 1)));
    } else {
      return Promise.reject(err);
    }
  });
};

$(function() {
  $genericLoader = $('<img src="./loader.gif" />');
  $genericLoader.insertBefore('#root');

  getContents('https://misfitathletics.com/blog/').then(response => {
    $genericLoader.remove();

    // return all hrefs (& dates) on index page
    return $(response).find('.entry.post').toArray().map(post => {
      const $post = $(post);
      const isRestDay = $post.find('.post__title').text().indexOf('Rest') >= 0;
      let href;
      let date;

      // If the post is the first one, some props are found differently
      if ($post.prop('tagName') == 'ARTICLE') {
        href = $post.find('.post__button').attr('href');
        date = moment().add(24, 'hours');
      } else {
        href = $post.attr('href');
        date = moment($post.find('time').text(), "MMMM D, YYYY").add(24, 'hours');
      }

      return {
        href,
        date,
        isRestDay
      };
    });
  }).then(posts => {
    $.each(posts, (i, post) => {
      const rowNumber = Math.round(moment().add(24, 'hours').startOf('week').diff(post.date.clone().startOf('week'), 'days') / 7);
      const colNumber = post.date.day();
      const $cell = $(`#cell-${rowNumber}-${colNumber}`);
      $cell.html('<img src="./loader.gif" />');

      getContents(post.href)
        .then(response => (parseInt(response.match(/(^|\s)postid-(\d+)(\s|$)/)[2]))) // parse post-id from body class
        .then(id => getContents('https://misfitathletics.com/wp-admin/admin-ajax.php?action=get_post_tabs&post_id=' + id))
        .then(JSON.parse)
        .then(postData => {
          const $content = $(`<td><h3>${post.date.format('ddd, MMM Do')}</h3></td>`);

          if (post.isRestDay) {
            $cell.html($content.append('<div>Rest Day</div>'));
          } else {
            $cell.html($content.append(postData.tabs[1].content));
            $cell.find('strong').first().parent().prevAll('p, div').remove(); // Remove all paragraphs and such before the first "title" (<strong />)
          }
        }).catch(err => {
          $cell.html('<div>MisFit is being a douche, looks like this request failed more than 3 times...</div>');
        });
    });
  }).catch(err => {
    $genericLoader.remove();
    alert('MisFit is being a douche.  Looks like this request failed 3 times...');
  });

  const shouldHideTips = JSON.parse(localStorage.getItem('hideTips'));
  toggleTips(shouldHideTips);

  $('.hide-tips').prop('checked', shouldHideTips);
  $('.hide-tips').on('change', event => (toggleTips(event.target.checked)));
});

<?php require __DIR__ . '/../bootstrap/app.php' ?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Findalab - Labs &amp; IHC Results</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="/dist/findalab.css">
    <style>
     body {
         margin: 0 auto;
         max-width: 900px;
         padding: 10px;
     }
    </style>
  </head>
  <body>

    <h1>Find A Lab - Labs &amp; IHC Results</h1>
    <div id="findalab">
      <div class="findalab-loading">
        <div class="findalab-loading__content">
          <h2>Loading Test Centers</h2>
          <img
            src="/three-dots.svg"
            alt="loading"
            width="50"
            onerror="this.src='/loading-gif.gif';this.onerror=null;" />
        </div>
      </div>
    </div>

    <button id="findalab-reset" type="button" style="margin-top: 16px;">Reset findalab</button>

    <script src="/js/lib/jquery.js"></script>
    <script src="/js/findalab.js"></script>
    <script src="https://maps.googleapis.com/maps/api/js?key=<?= env('GOOGLE_MAP_API_KEY'); ?>&amp;callback=initMap" async></script>

    <script>
     function initMap() {
         var findalab;
         $('#findalab').load('/template/findalab.html', function() {
             window.labfinder = $(this).find('.findalab').findalab({
                 baseURL: 'http://findalab.local/fixtures/labs-ihc-results'
             });
         });
         $('#findalab-reset').on('click', function() {
             window.labfinder.reset();
         });
     }
    </script>

  </body>
</html>

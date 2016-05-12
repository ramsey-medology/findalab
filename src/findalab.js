(function($) {
  $.fn.extend({

    /**
     * Controller for Lab Search component.
     *
     * @param   {{lat:float, long:float}} settings
     * @var {object} find
     * @returns {labSearch}
     */
    findalab: function(settings) {
      var self = this;

      this.settings = {
        baseURL: 'http://localhost:6789/',
        googleMaps: {
          defaultLat: 39.97712, // TODO: Address Canada's default lat
          defaultLong: -99.587403, // TODO: Address Canada's default long
          geoCoder: null,
          infoWindow: null,
          initialZoom: 4, // The zoom level for when no search has been performed yet (pretty far out)
          map: null,
          markers: [],
          resultsZoom: 10 // The zoom level for when there are search results
        },
        searchFunction: {
          excludeNetworks: undefined,
          limit: undefined,
          onlyNetwork: undefined
        },
        lab: {
          buttonClass: null,
          buttonText: 'Choose This Location'
        },
        search: {
          buttonClass: null,
          buttonLoadingText: '...',
          buttonText: 'Search',
          inputGroupButtonClass: null,
          inputGroupClass: null,
          inputGroupFieldClass: null,
          placeholder: 'Enter your zip'
        }
      };

      this.settings = $.extend(this.settings, settings);

      var emptyResultsMessage = 'Please "' + this.settings.search.placeholder + '" above and press "' +
      this.settings.search.buttonText + '" to see results.';

      var noResultsMessage = 'Oops! Sorry, we could not find any testing centers near that location. ' +
      'Please try your search again with a different or less specific address.';

      /**
       * Initializes the map and sets the default viewport lat / long.
       *
       * @var {object} google
       * @param {{lat:float, long:float}} settings
       */
      this.construct = function(settings) {

        this.find('[data-findalab-empty-list-message]').html(emptyResultsMessage);
        this.find('[data-findalab-search-button]').addClass(self.settings.search.buttonClass).html(
          self.settings.search.buttonText
        );
        this.setPlaceholder(self.settings.search.placeholder);
        this.find('[data-findalab-search-button]').on('click', $.proxy(this._onSearchSubmit, this));

        this.find('[data-findalab-search-field]').keyup($.proxy(function(e) {
          e.preventDefault();

          if (e.keyCode == 13) {
            this._onSearchSubmit(e);
          }

          return false;
        }, this));

        if (typeof google === 'undefined') {
          alert('Hey! The Google Maps script is missing or not properly called, please check ' +
          'the Medology Find A Labs component documentation to make sure everything is ' +
          'setup correctly.');
        }

        var mapOptions = {
          center: this._buildLatLong(self.settings.googleMaps.lat, self.settings.googleMaps.long),
          zoom: self.settings.googleMaps.initialZoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        };

        self.settings.googleMaps.map = new google.maps.Map(document.getElementById('findalab-map'), mapOptions);

        self.settings.googleMaps.geoCoder = new google.maps.Geocoder();

        self.settings.googleMaps.infoWindow = new google.maps.InfoWindow();

        this._contentNav();

        // Capture lab selection events
        this.on('click', '[data-findalab-result-button]', $.proxy(function(event) {
          event.preventDefault();
          this._onLabSelect($(event.target).data());

          return false;
        }, this));
      };

      /**
       * Tab navigation on smaller screens.
       */
      this._contentNav = function() {
        $('[data-findalab-nav-item]').on('click', function() {
          content = $(this).data('findalab-nav-item');
          $('[data-findalab-nav-item]').removeClass('is-active');
          $(this).addClass('is-active');
          self.find('[data-findalab-content]').removeClass('is-active');
          self.find('[data-findalab-content="' + content + '"]').addClass('is-active');
          self.resize();
        });
      };

      /**
       * This functionwill handle clearing error text.
       */
      this.clearError = function() {
        this.find('[data-findalab-error]').addClass('findalab__hide').html('');
      };

      /**
       * Returns the country code for the specified zip code.
       *
       * Currently only supports Canada, United States and Puerto Rico.
       *
       * @param   {string} zipCode The zipCode to get the country code for.
       * @returns {string} The two character country code. Either CA, PR or US.
       */
      this.getZipCodeCountry = function(zipCode) {
        var caRegex = new RegExp(
          /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ]( )?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i
        );

        if (caRegex.test(zipCode)) {
          return 'CA';
        }

        // Check for Puerto Rico zips
        var intZip = parseInt(zipCode);
        if ((intZip >= 600 && intZip <= 799) || (intZip >= 900 && intZip <= 999)) {
          return 'PR';
        }

        if (isNaN(intZip)) {
          return 'Unknown';
        }

        return 'US';
      };

      /**
       * Triggers the Google Maps resize event.
       *
       * Useful for when the map was hidden when it booted.
       */
      this.resize = function() {
        google.maps.event.trigger(self.settings.googleMaps.map, 'resize');
      };

      /**
       * Event handler for when a zip / postal code is submitted for search.
       *
       * Can be overridden with custom behavior for the particular page that the
       * map is embedded into. The method should return false if the search should
       * be cancelled (input validation etc)
       *
       * @param  {string}  zip The zip or postal code that was entered into the search field.
       * @throws {string}  error message if the search cannot be performed for some reason.
       */
      this.onSearchSubmit = function(zip) {
        // override me!
      };

      /**
       * Event handler for when a search is successful.
       *
       * Can be overridden with custom behavior for the particular page that the
       * map is embedded into.
       *
       * @param {[]}    labs  The labs that were returned from the server.
       * @param {float} lat   The latitude used for the search.
       * @param {float} long  The longitude used for the search.
       */
      this.onSearchSuccess = function(labs, lat, long) {
        // override me!
      };

      /**
       * Event handler for when a search fails.
       *
       * Can be overridden with custom behavior for the particular page that the
       * map is embedded into.
       *
       * @param {string} message The error message.
       */
      this.onSearchError = function(message) {
        // override me!
      };

      /**
       * Event handler for when a user selects a lab.
       *
       * Should be overridden to implement the appropriate behavior
       * on the page this component is used on.
       *
       * @param {{
       *   id:int,
       *   lab_title:string,
       *   network:string,
       *   address:string,
       *   city:string,
       *   state:string,
       *   zip:int
       * }} lab
       */
      this.onLabSelect = function(lab) {
        // override me!
      };

      /**
       * Resets the lab finder to its default state.
       */
      this.reset = function() {
        this.find('.findalab__results li:gt(0)').remove();
        this.find('[data-findalab-search-field]').val('');
        this.find('[data-findalab-total]').html('No Results');
        this.find('[data-findalab-error]').addClass('findalab__hide').html('');
        this.find('[data-findalab-empty-list-message]').removeClass('findalab__hide');

        self.settings.googleMaps.map.setCenter(this._buildLatLong(
          self.settings.googleMaps.defaultLat, self.settings.googleMaps.defaultLong
        ));
        self.settings.googleMaps.map.setZoom(self.settings.googleMaps.initialZoom);
        self.settings.googleMaps.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);

        for (var i = 0; j = self.settings.googleMaps.markers.length, i < j; i++) {
          self.settings.googleMaps.markers[i].setMap(null);
        }

        self.settings.googleMaps.markers = [];
      };

      /**
       * This function will retrieve latitude and longitudes and also labs
       * near these coordinates.
       */
      this.search = function(zipcode) {
        this.clearError();
        this.find('[data-findalab-search-field]').val(zipcode);

        try {
          var country = this.getZipCodeCountry(zipcode);
          if (country == 'Unknown') {
            throw this.noResultsMessage;
          }

          this.onSearchSubmit(zipcode, country);
        } catch (error) {
          this.setError(error);
          return;
        }

        $('[data-findalab-search-button]').html(this.searchButtonLoadingText);

        $.ajax({
          url: self.settings.baseURL + '/geocode',
          dataType: 'json',
          data: { zip: zipcode, countryCode: country },
        }).done(
            /**
             * @param {[{latitude:float, longitude:float, countryCode:string}]}  result
             */
            function(result) {
              if (result.length == 0) {
                self._onSearchErrorString('No Results');
              }

              $.ajax({
                url: self.settings.baseURL + '/labs/nearCoords',
                dataType: 'json',
                data: $.extend({
                  countryCode: country,
                  filterNetwork: self.settings.searchFunction.excludeNetworks,
                  labCount: self.settings.searchFunction.limit,
                  network: self.settings.searchFunction.onlyNetwork,
                }, result[0]),
              }).
              done(self._onSearchSuccess).
              fail(self._onSearchError).
              always($.proxy(self._onSearchComplete, self));
            }).fail(function(jqXhr) {
          self._onSearchError(jqXhr);
          self._onSearchComplete();
        });
      };

      /**
       * Sets the placeholder text for the search input.
       *
       * @param {string} message the placeholder message
       */
      this.setPlaceholder = function(message) {
        this.find('[data-findalab-search-field]').attr('placeholder', message);
      };

      /**
       * Sets the text to display on the lab select buttons.
       *
       * @param {string} text
       */
      this.setLabSelectText = function(text) {
        this.find('[data-findalab-result-button]').html(text);
        self.settings.lab.buttonText = text;
      };

      /**
       * Displays the specified error message to the user.
       *
       * @param {string} message This is the error message that will be shown.
       */
      this.setError = function(message) {
        this.find('[data-findalab-error]').removeClass('findalab__hide').html(message);
      };

      /**
       * Builds a Google Maps Latitude/Longitude object.
       *
       * @param   {float} lat  Optional latitude parameter.
       * @param   {float} long Optional longitude parameter.
       * @return  {{}}
       * @private
       */
      this._buildLatLong = function(lat, long) {
        lat = lat !== undefined ? lat : self.settings.googleMaps.defaultLat;
        long = long !== undefined ? long : self.settings.googleMaps.defaultLong;

        return new google.maps.LatLng(lat, long);
      };

      /**
       * Initializes the "Show Hours" link for Labs.
       *
       * @private
       */
      this._initShowStructuredHours = function() {
        /**
         * Hide/Show Hours
         * @see https://css-tricks.com/snippets/jquery/toggle-text/
         */
        $('[data-findalab-toggle-hours]').on('click', function(event) {
          event.preventDefault();
          var $link = $(this);
          var $toggle = $link.siblings('.findalab__hours');
          $link.text($toggle.is(':visible') ? 'Show ▼' : 'Hide ▲');
          $toggle.slideToggle('300');
        });
      };

      /**
       * Centers the map to the specified coordinates.
       *
       * @param {float} lat   The latitude to center to.
       * @param {float} long  The longitude to center to.
       * @private
       */
      this._centerMap = function(lat, long) {
        self.settings.googleMaps.map.setCenter(this._buildLatLong(lat, long));

        self.settings.googleMaps.geoCoder.geocode({
              address: lat + ',' + long,
            },
            /**
             * @param {[{geometry:{}}]} results
             * @param status
             */
            function(results, status) {
              if (status == google.maps.GeocoderStatus.OK) {
                self.settings.googleMaps.map.setCenter(results[0].geometry.location);
              } else {
                alert('Geocode was not successful for the following reason: ' + status);
              }
            }
        );
      };

      /**
       * Private event handler for when the user selects a lab.
       *
       * @param {{
       *   id:int,
       *   lab_title:string,
       *   network:string,
       *   address:string,
       *   city:string,
       *   state:string,
       *   zip:int
       * }} lab
       */
      this._onLabSelect = function(lab) {
        this.onLabSelect(lab);
      };

      /**
       * Show markers function
       *
       * @param {{
       *    center_id:int,
       *    center_latitude:float,
       *    center_longitude:float,
       *    center_address:string,
       *    center_city:string,
       *    center_state:string,
       *    center_zip:string,
       *    center_network:string,
       *    center_country:string,
       *    lab_title:string,
       *    network:string,
       * }} lab
       * @private
       */
      this._showMarker = function(lab) {
        var location = this._buildLatLong(lab.center_latitude, lab.center_longitude);
        var vMarker;

        var mapMarker = {
          path: 'm-13.86316,-25.61974l10.845,22.96658c0.31974,0.69158 0.79816,1.17' +
          '1.38316,1.54184c0.63711,0.37184 1.32868,0.585 2.02026,0.585c0.69158,0 1.38079,-0.21316' +
          ' 2.02027,-0.585c0.585,-0.37184 1.06342,-0.85026' +
          ' 1.38079,-1.54184l10.845,-22.96658c0.63947,-1.38079 0.95684,-3.13579' +
          ' 0.95684,-5.31473c0,-4.14711 -1.48737,-7.76132 -4.46448,-10.68632c-2.9771,-2.9771' +
          ' -6.53921,-4.46447 -10.73842,-4.46447c-4.19921,0 -7.76131,1.48737' +
          ' -10.73842,4.46447c-2.9771,2.925 -4.46684,6.53921 -4.46684,10.68632c0,2.17894' +
          ' 0.31974,3.93394 0.95684,5.31473l0,0zm14.24842,-12.86289c2.07237,0 3.87948,0.74368' +
          ' 5.36921,2.23105c1.48737,1.48974 2.23342,3.24237 2.23342,5.31711c0,2.12447 -0.74605,' +
          ' 3.87947 -2.23342,5.36921c-1.48973,1.48737 -3.29684,2.23105 -5.36921,2.23105c-2.07473,' +
          ' 0 -3.88184,-0.74368 -5.36921,-2.23105c-1.48973,-1.48974 -2.23342,-3.24474' +
          ' -2.23342,-5.36921c0,-2.07474 0.74369,-3.82737 2.23342,-5.31711c1.48737,-1.48737' +
          ' 3.29448,-2.23105 5.36921,-2.23105l0,0z',
          fillColor: '#3398db',
          fillOpacity: 1,
          scale: 1,
          strokeColor: 'white',
          strokeWeight: 2
        };

        vMarker = new google.maps.Marker({
          map: self.settings.googleMaps.map,
          icon: mapMarker,
          position: location
        });

        self.settings.googleMaps.markers.push(vMarker);

        google.maps.event.addListener(vMarker, 'click', $.proxy(function() {
          self.settings.googleMaps.infoWindow.setContent(
              '<h6>' + lab.lab_title + '</h6>' +
              '<p>' +
              lab.center_address + '<br>' +
              lab.center_city + ', ' + lab.center_state + ' ' + lab.center_zip +
              '</p>' +
              '<a ' +
              'class="' + self.settings.lab.buttonClass + '" ' +
              'href="#" ' +
              'data-id="' + lab.center_id + '" ' +
              'data-address="' + lab.center_address + '" ' +
              'data-city="' + lab.center_city + '" ' +
              'data-state="' + lab.center_state + '" ' +
              'data-zip="' + lab.center_zip + '" ' +
              'data-network="' + lab.network + '" ' +
              'data-title="' + lab.lab_title + '" ' +
              'data-country="' + lab.center_country + '"' +
              '>' +
              this.self.settings.lab.buttonText +
              '</a>'
          );

          // noinspection JSUnresolvedFunction
          self.settings.googleMaps.infoWindow.open(self.settings.googleMaps.map, vMarker);
        }, this));
      };

      /**
       * This functionwill handle rendering labs.
       * @param {[{
       *   center_id:int,
       *   center_address:string,
       *   center_city:string,
       *   center_state:string,
       *   center_zip:string,
       *   center_hours:string,
       *   center_network:string,
       *   center_distance:float,
       *   lab_title:string,
       *   network:string,
       *   structured_hours:object
       * }]} labs
       * @private
       */
      this._render = function(labs) {
        var $resultsList = this.find('[data-findalab-result-list]');
        var $resultTemplate = this.find('[data-findalab-result]');
        var pluralLabs = labs.length > 1 ? 's' : '';

        $resultsList.html('');
        this.find('[data-findalab-total]').html(labs.length + ' Result' + pluralLabs);

        /**
         * @param {int} index
         * @param {{
         *   center_id:int,
         *   center_address:string,
         *   center_city:string,
         *   center_state:string,
         *   center_zip:string,
         *   center_hours:string,
         *   center_network:string,
         *   center_distance:float,
         *   lab_title:string,
         *   network:string,
         *   structured_hours:object
         * }} lab
         */
        $.each(labs, $.proxy(function(index, lab) {
          var $result = $resultTemplate.clone();

          if (lab.lab_title) {
            $result.find('[data-findalab-result-title]').html(lab.lab_title);
          } else {
            $result.find('[data-findalab-result-title]').remove();
          }

          $result.find('[data-findalab-result-address]').html(
            lab.center_address + '<br>' +
            lab.center_city + ', ' + lab.center_state + ' ' + lab.center_zip
          );
          $result.find('[data-findalab-result-distance]').html(
            '<strong>Distance:</strong> ' + this._parseDistance(lab)
          );
          $result.find('[data-findalab-result-button]')
          .attr('data-id', lab.center_id)
          .attr('data-address', lab.center_address)
          .attr('data-city', lab.center_city)
          .attr('data-state', lab.center_state)
          .attr('data-zip', lab.center_zip)
          .attr('data-network', lab.network)
          .attr('data-title', lab.lab_title)
          .addClass(self.settings.lab.buttonClass)
          .html(self.settings.lab.buttonText);

          if (!lab.structured_hours) {
            $result.find('[data-findalab-result-structured-hours]').remove();
            $result.find('[data-findalab-result-simple-hours]').html(
              '<strong>Hours:</strong> ' + lab.center_hours
            );
          } else {
            $result.find('[data-findalab-result-simple-hours]').remove();
            this._buildHoursDom(lab, $result);
            $result.find('[data-findalab-structured-hours-row][data-template]').remove();
          }

          $result.removeClass('findalab__hide').appendTo('[data-findalab-result-list]');
          self.find('[data-findalab-empty-list-message]').addClass('findalab__hide');

        }, this));

        this._initShowStructuredHours();

        labs.map($.proxy(this._showMarker, this));

        if (labs[0]) {
          this._centerMap(labs[0].center_latitude, labs[0].center_longitude);
          self.settings.googleMaps.map.setZoom(self.settings.googleMaps.resultsZoom);
        }
      };

      /**
       * Parse the distance of lab based on the country where the lab located
       *
       * @param   {{center_country:string, center_distance:string}} labData
       * @returns {string} The parsed string describe the distance information.
       * @private
       */
      this._parseDistance = function (labData) {
        var parsedDistance = '';
        switch (labData.center_country) {
          case "CA" :
            parsedDistance = (labData.center_distance / 0.62137).toFixed(2) + "km.";
            break;
          case "US" :
          default:
            parsedDistance = labData.center_distance.toFixed(2) + "mi.";
            break;
        }
        return "<dd>" + parsedDistance + "</dd>";
      };

      /**
       * Builds the structured hours DOM for a Lab entry.
       *
       * @param {{
       *   center_id:int,
       *   center_address:string,
       *   center_city:string,
       *   center_state:string,
       *   center_zip:string,
       *   center_hours:string,
       *   center_network:string,
       *   center_distance:float,
       *   lab_title:string,
       *   network:string,
       *   structured_hours:object
       * }} lab
       * @param   {jQuery} $result The jQuery DOM that should be modified to show the hours.
       * @returns {string} The structured hours DOM.
       * @private
       */
      this._buildHoursDom = function(lab, $result) {
        var $table = $result.find('[data-findalab-structured-hours-body]');

        /**
         * @param {{string}} day
         * @param {{open:string, close:string, lunch_start:string, lunch_stop:string}} hours
         */
        $.each(lab.structured_hours, function(day, hours) {
          var $row = $result.find('[data-findalab-structured-hours-row][data-template]').clone();
          $row.removeAttr('data-template');
          $row.find('[data-findalab-result-day]').html(day);
          $row.find('[data-findalab-result-hours]').html(hours.open + ' - ' + hours.close);

          if (hours.lunch_start) {
            $row.find('[data-findalab-result-hours-lunch]').html(hours.lunch_start + ' - ' + hours.lunch_stop);
          } else {
            $row.find('[data-findalab-result-day-lunch]').remove();
            $row.find('[data-findalab-result-hours-lunch]').remove();
          }

          $table.append($row);
        });
      };

      /**
       * Private event handler for a search is initiated.
       *
       * @private
       */
      this._onSearchSubmit = function(event) {
        event.preventDefault();

        var zip = this.find('[data-findalab-search-field]').val();

        this.search(zip);

        return false;
      };

      /**
       * Private event handler for when a search is successful.
       *
       * @param {{
       *  labs:[{
       *    center_id:int,
       *    center_address:string,
       *    center_city:string,
       *    center_state:string,
       *    center_zip:string,
       *    center_hours:string,
       *    center_network:string,
       *    center_distance:float,
       *    lab_title:string,
       *    network:string,
       *    structured_hours:object
       *   }],
       *   latitude:float,
       *   longitude:float
       * }}    response
       * @private
       */
      this._onSearchSuccess = function(response) {
        if (response.labs.length == 0) {
          self._onSearchErrorString(self.noResultsMessage);
        } else {
          self._render(response.labs);
          self.onSearchSuccess(response.labs, response.latitude, response.longitude);
        }
      };

      /**
       * Private event handler for when a search fails. (jqXhr version)
       *
       * @param {{responseText:string}} jqXhr
       * @private
       */
      this._onSearchError = function(jqXhr) {
        self._onSearchErrorString(jqXhr.responseText);
      };

      /**
       * Private event handler for when a search fails. (string version)
       *
       * @param {string} message
       * @private
       */
      this._onSearchErrorString = function(message) {
        this.find('[data-findalab-result-list]').html(
          '<li class="findalab__result">There are no search results.</li>'
        );

        self.setError(self.noResultsMessage);
        self.onSearchError(JSON.parse(message).message);
      };

      /**
       * This functionwill handle clean up after searches regardless of server response.
       * @private
       */
      this._onSearchComplete = function() {
        this.find('[data-findalab-search-button]').html(this.searchButtonText);
      };

      this.construct(settings);

      return this;
    }
  });
})(jQuery);
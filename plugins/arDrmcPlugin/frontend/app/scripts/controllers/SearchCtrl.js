'use strict';

/**
 * SearchCtrl contains the business logic for all our share pages. It shares
 * state with other controllers via SearchService.
 */
module.exports = function ($scope, $stateParams, SearchService, $filter, $modal, SETTINGS, ModalDigitalObjectViewerService) {
  // Search state
  $scope.criteria = {};
  $scope.criteria.limit = 10;
  $scope.page = 1; // Don't delete this, it's an important default for the loop

  // Reference to types of searches
  $scope.tabs = SearchService.searches;

  // Changes in scope.page updates criteria.skip
  $scope.$watch('page', function (value) {
    $scope.criteria.skip = (value - 1) * $scope.criteria.limit;
  });

  // TODO: watch changes only in SearchService.query, not working for me!
  // Instead of a pull mechanism, I could push changes using $broadcast...
  $scope.$watch(function () {
    $scope.criteria.query = SearchService.query;
  });

  // Watch for criteria changes
  $scope.$watch('criteria', function () {
    $scope.search();
  }, true); // check properties when watching

  // Perfom query after entity changes
  $scope.$watch($stateParams.entity, function (newVal, oldVal) {
    if (newVal === oldVal) {
      return;
    }
    $scope.search();
  });

  $scope.search = function () {
    SearchService.search($stateParams.entity, $scope.criteria)
      .then(function (response) {
        $scope.data = response.data;
        $scope.$broadcast('pull.success', response.data.total);
      }, function (reason) {
        console.log('Failed', reason);
        delete $scope.data;
      });
    if ($stateParams.entity === 'aips') {
      SearchService.getAIPTypes()
        .success(function (data) {
          $scope.classifications = data.terms;
        });
    }
  };

  $scope.getTermLabel = function (facet, id) {
    if (undefined === $scope.data) {
      return id;
    }
    for (var term in $scope.data.facets[facet].terms) {
      if (parseInt($scope.data.facets[facet].terms[term].term) === parseInt(id)) {
        return $scope.data.facets[facet].terms[term].label;
      }
    }
  };

  $scope.getSizeRangeLabel = function (from, to) {
    if (typeof from !== 'undefined' && typeof to !== 'undefined') {
      return 'Between ' + $filter('UnitFilter')(from) + ' and ' + $filter('UnitFilter')(to);
    }
    if (typeof from !== 'undefined') {
      return 'Bigger than ' + $filter('UnitFilter')(from);
    }
    if (typeof to !== 'undefined') {
      return 'Smaller than ' + $filter('UnitFilter')(to);
    }
  };

  $scope.getDateRangeLabel = function (facet, from, to) {
    for (var range in $scope.data.facets[facet].ranges) {
      if ($scope.data.facets[facet].ranges[range].from === from && $scope.data.facets[facet].ranges[range].to === to) {
        return $scope.data.facets[facet].ranges[range].label;
      }
    }
  };

  // Support AIP overview toggling
  $scope.showOverview = true;
  $scope.toggleOverview = function () {
    $scope.showOverview = !$scope.showOverview;
  };

  $scope.openReclassifyModal = function (aip) {
    // Current AIP selected equals to AIP in the modal
    $scope.aip = aip;
    // It happens that $modal.open returns a promise :)
    var modalInstance = $modal.open({
      templateUrl: SETTINGS.viewsPath + '/modals/reclassify-aips.html',
      backdrop: true,
      controller: 'AIPReclassifyCtrl',
      scope: $scope, // TODO: isolate with .new()?
      resolve: {
        classifications: function () {
          return $scope.classifications;
        }
      }
    });
    // This is going to happen only if the $modal succeeded
    modalInstance.result.then(function (result) {
      aip.class = result;
    });
  };

  $scope.openViewer = function (file) {
    ModalDigitalObjectViewerService.open(file);
  };
};
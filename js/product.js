(function(){
	var app = angular.module('store-directives',[]);
	// 产品描述指令
	app.directive('productDescription',function(){
		return {
			restrict:'E',
			templateUrl:'product-description.html'
		};
	});
	// 产品规格指令
	app.directive('productSpecs',function(){
	    return {
	      restrict:'A',
	      templateUrl:'product-specs.html'
	    }
	});
    //产品评论
    app.directive('productReview',function(){
    	return {
    		restrict:'A',
    		templateUrl:'product-review.html'
    	}
    });

    //产品 tab指令
    app.directive('productTabs',function(){
    	return {
		      restrict:'E',
		      templateUrl:'product-tabs.html',
		      controller:function(){
		        this.tab = 1;
		        this.isSet = function(checkTab) {
		           return this.tab === checkTab;
		         };
		        this.setTab = function(setTab) {
		           this.tab = setTab;
		        };
		      },
		      controllerAs:'tabs'
	    };
    });

    app.directive('productGallery',function(){
    	return {
    		restrict:'E',
    		templateUrl:'product-gallery.html',
    		controller:function(){
    			this.num = 0;
				this.setNum = function(value){
					this.num = value || 0;
				};
    		},
    		controllerAs:'gallery'
    	}
    });

})()
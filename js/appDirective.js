// 立即执行函数，封闭空间是个好习惯

(function(){
	
	var app = angular.module('gemStore',[]);
	//获取商品列表控制器
	app.controller('StoreController',function(){
		this.products = gems;
	});
	//获取商品tab选项卡控制器
	app.controller('TabController',function(){
		this.tab = 1;
		this.setTab=function(value){
			this.tab = value;
		};
		this.isSet = function(value){
			return this.tab === value;
		};
	});

	//图片对应切换选择器
	app.controller('GalleryController',function(){
		this.num = 0;
		this.setNum = function(value){
			this.num = value || 0;
		};
	});
	//添加评论选择器
	app.controller('ReviewController',function(){
		this.review = {};
		this.addReview = function(whichs){
			this.review.createdOn = Date.now();
			whichs.reviews.push(this.review);
			this.review = {};
		};
	});

	// 产品描述指令
	app.directive("productDescription",function(){
		return {
			restrict: 'E',
			templateUrl: "product-description.html"
		};
	});
	// 产品规格指令
	app.directive('productSpecs',function(){
	    return {
	      restrict:'A',
	      templateUrl:'product-specs.html'
	    }
    });










	var gems = [
		{
			name:"粉钻",
			description:"粉钻是指粉色的钻石,成因是钻石呈粉色是因为它的结构发生了变化,所以显粉色。",
			shine: 8,
	        price: 110.50,
	        rarity: 7,
	        color: '#CCC',
			canPurchase:true,
			soldOut:false,
			images:[
				"img/pinkGem1.jpg",
				"img/pinkGem2.jpg",
				"img/pinkGem3.jpg",
				"img/pinkGem4.jpg"
			],
			sellTime:(new Date()).getTime(),
			reviews:[
				{
					stars:5,
					body :"I love this gem very much !",
					author:"tracy Ding@www.com",
					createdOn: 1397490980837


				},
				{
					stars:5,
					body :"It is so beautiful!",
					author:"Double wei@www.com",
					createdOn: 1397490980837

				}
			]
		},
		{
			name:"黄钻",
			description:"黄色钻石简称黄钻，又称金钻，是指钻石中颜色纯正、色调鲜明的黄色或金黄色的彩钻。",
			shine: 5,
            price: 88.50,
            rarity: 7,
            color: '#CCC',
			canPurchase:true,
			soldOut:false,
			images:[
				"img/yellowGem1.jpg",
				"img/yellowGem2.jpg",
				"img/yellowGem3.jpg",
				"img/yellowGem4.jpg"
			],
			sellTime:"1480045396228",
			reviews:[
				
				{	stars:3,
					body :"bad !",
					author:"tracy Ding@www.com",
					createdOn: 1397490980837

				}
			]
		},
		{
			name:"红钻",
			description:"红钻是钻石中珍品，价格最为昂贵。",
			shine: 9,
            price: 140,
            rarity: 7,
            color: '#CCC',
			canPurchase:false,
			soldOut:false,
			images:[
				"img/redGem1.jpg",
			    "img/redGem2.jpg",
			    "img/redGem3.jpg",
			    "img/redGem4.jpg"
			],
			sellTime:"1480045396228",
			reviews:[
				{
					stars:5,
					body :"gooooooooooooood !",
					author:"tracy Ding@www.com",
					createdOn: 1397490980837

				},
				{
					stars:5,
					body :"niceeeeeeeeeeeeeeee!",
					author:"Double wei@www.com",
					createdOn: 1397490980837

				}
			]
		}
	]

})()
(function ($) {
    var kendo = window.kendo,
    ui = kendo.ui,
    Widget = ui.Widget;

    var Slider = Widget.extend({
        init: function (element, options) {
            var that = this;
            Widget.fn.init.call(this, element, options);
            that._create();
        },

        options: {
            name: "Slider",
            slideshow: null,
            id: null
        },

        _templates: {
            header: '<div class="section-header" style="padding: 16px 0px;">#: slideshow.name #</div>',
            slider: '<div id="slider_#: id #" style="width: #: slideshow.width #px; overflow: hidden; margin: 0px auto;"></div>',
            slides: '<ul class="k-floatwrap" style="width: #: slideshow.width * (slideshow.slides.length === 1 ? 1 : 2) #px; padding: 0px; margin: 0px;"></ul>',
            slide: '<li style="width: #: slideshow.width #px; text-align: center; height: #: slideshow.height #px; list-style: none; float: left;"></li>',
            navcont: '<div id="nav_#: id #"></div>',
            navs: '<ul class="k-floatwrap" style="padding: 0px; width: 100%; margin: 0px auto; text-align: center; font-size: 0; list-style: none;"></ul>',
            nav: '<li style="display: -moz-inline-box; display: inline-block; margin: 0px 10px;"></li>',
            link: '<a href="\\#" style="float: left; font-size:13px;">#: name #</a>'
        },

        _currindex: 0,
        _nextindex: 1,
        _sliding: false,
        _static: false,
        _paused: false,

        _create: function () {
            var that = this;

            //if no slides, return; if only one slide then set to static slideshow
            if (that.options.slideshow.slides === null || that.options.slideshow.slides.length === 0) {
                return;
            }
            else if (that.options.slideshow.slides.length === 1) {
                that._static = true;
            }

            //if id is not passed in, generate a random one in case of multiple slideshows on one page
            if (that.options.id === null) {
                that.options.id = Math.floor(Math.random() * 1001).toString();
            }

            //remove disabled slides from slide collection
            that.options.slideshow.slides = $.grep(that.options.slideshow.slides, function (value, index) {
                return value.disabled === false;
            });

            //create elements using kendo templates
            var template = kendo.template(that._templates.header);
            that.header = $(template(that.options));

            template = kendo.template(that._templates.slider);
            that.slider = $(template(that.options));

            template = kendo.template(that._templates.navcont);
            that.navcont = $(template(that.options));

            template = kendo.template(that._templates.navs);
            that.navs = $(template(that.options));

            template = kendo.template(that._templates.slides);
            that.slides = $(template(that.options));

            template = kendo.template(that._templates.slide);
            that.slide1 = $(template(that.options)).attr("data-index", "0");
            that.slide2 = $(template(that.options)).attr("data-index", "1");

            //add elements to DOM
            that.element.css({ "text-align": "center", "width": "100%" });
            that.element.append(that.header);
            that.element.append(that.slider);
            that.slider.append(that.slides);
            that.slides.append(that.slide1);

            if (!that._static) {
                that.slides.append(that.slide2);
                that.slider.after(that.navcont);
                that.slider.after($("<br />"));
                that.navcont.append(that.navs);

                that.element.mouseenter(function () {
                    if (!that._sliding) {
                        that._paused = true;
                    }
                }).mouseleave(function () {
                    that._paused = false;
                });
            }

            //create navigation for slides
            that._createNavigation();

            //pre-populate slide elements with current and next slides
            that._populateSlides();

            //start slide loop
            that._startSlideshow();
        },

        _startSlideshow: function () {
            var that = this;

            if (!that._static) {
                setInterval(function () {
                    if (!that._paused) {
                        that._sliding = true;
                        that.slides.animate({ marginLeft: "-" + that.options.slideshow.width + "px" }, 1000, function () {
                            //move slide that just went out of view on left to end of slides
                            $(this).find("li:last").after($(this).find("li:first"));
                            $(this).css({ marginLeft: 0 });

                            that._currindex = that._getIndex();
                            that._setSelectedNav(that._currindex);
                            that._nextindex = that._getIndex();
                            that._populateSlide(that._nextindex, false);
                            that._sliding = false;
                        });
                    }
                }, that.options.slideshow.interval);
            }
        },

        _createNavigation: function () {
            var that = this;

            if (!that._static) {
                $.each(that.options.slideshow.slides, function (index, value) {
                    //create elements using kendo templates
                    var template = kendo.template(that._templates.nav);
                    that.nav = $(template(that.options));

                    template = kendo.template(that._templates.link);
                    that.link = $(template({ name: value.name })).attr("data-index", index);

                    //add elements to DOM
                    that.navs.append(that.nav);
                    that.nav.append(that.link);

                    //set first nav as selected
                    if (index === 0) {
                        that._setSelectedNav(0);
                    }

                    //set up click event for the link
                    that.link.click(function (e) {
                        e.preventDefault();

                        //only allow click when not animating
                        if (that._sliding) {
                            return;
                        }

                        that._currindex = $(this).data("index");
                        that._setSelectedNav(that._currindex);
                        that._nextindex = that._getIndex();

                        //populate slide elements with current and next slides
                        that._populateSlides();
                    });
                });
            }
        },

        _getIndex: function () {
            var that = this;
            return that._currindex === that.options.slideshow.slides.length - 1 ? 0 : that._currindex + 1;
        },

        _setSelectedNav: function (index) {
            var that = this;
            var navslides = $("#nav_" + that.options.id + " ul li a");
            navslides.css("font-weight", "normal");
            $(navslides[index]).css("font-weight", "bold");
        },

        _populateSlides: function () {
            var that = this;

            //populate current slide and next slide if exists
            that._populateSlide(that._currindex, true);
            if (!that._static) {
                that._populateSlide(that._nextindex, false);
            }
        },

        _populateSlide: function (index, isCurrSlide) {
            var that = this;

            //populate current or next slide by fetching content via cache or ajax call
            var position = isCurrSlide ? "first" : "last";
            var slideslist = $(that.slides);
            var slide = that.options.slideshow.slides[index];
            if (slide.content === "") {
                $.get(slide.url, function (data) {
                    that.options.slideshow.slides[index].content = data;
                    if ($(slideslist).find("li:" + position).data("index") === 0) {
                        that.slide1.html(data);
                    }
                    else {
                        that.slide2.html(data);
                    }
                });
            }
            else {
                if ($(that.slides).find("li:" + position).data("index") === 0) {
                    that.slide1.html(slide.content);
                }
                else {
                    that.slide2.html(slide.content);
                }
            }
        }
    });

    // add the widget to the ui namespace so it's available
    ui.plugin(Slider);
})(jQuery);

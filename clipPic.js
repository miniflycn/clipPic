/**
* 图片裁剪模块
* @description: 图片裁剪模块
* @author : donaldyang
* @depend Zepto
**/

!function (root, factory) {
    if (root.define && root.define.amd) {
        define(['Zepto'], factory);
    } else {
        root['clipPic'] = factory(root['Zepto']);
    }
}(window, function ($) {
    // tempalte
    var CONTAINER_TPL = [
        '<div style="background:#000;position:fixed;width:100%;height:100%;z-index:10;left:0px;top:0px;">',
            '<img src="about:blank" style="position:absolute; -webkit-transform: translate3d(0px,0px,0px);">',
            '<div style="position:absolute;width:100%;height:100%;top:0;left:0;" id="touch-holder">',
                '<div style="border:1px solid rgba(255, 255, 255, 0.5);outline: 200px solid rgba(0, 0, 0, 0.6);width: 220px;height: 330px;position: relative;margin-left: 50%;left: -110px;margin-top: {{margin-top}};" id="clip-box">',
                '</div>',
                '<div style="height:50px;width:100%;position:absolute;bottom:0px;background:#000;">',
                    '{{cancel-btn}}',
                    '{{submit-btn}}',                    
                '</div>',
            '</div>',
        '</div>'
    ].join(''),
        CANCEL_TPL = '<a href="javascript:" style="font-size: 20px; line-height: 50px; display: inline-block; float: left; margin-left: 20px; color: #fff;" id="cancel-clip">{{cancel-word}}</a>',
        SUBMIT_TPL = '<a href="javascript:" style="font-size: 20px; line-height: 50px; display: inline-block; float: right; margin-right: 20px; color: #fff;" id="submit-clip">{{submit-word}}</a>',
        CANCEL_WORD = 'cancel',
        SUBMIT_WORD = 'upload';

    // cal the distance of two touch
    function distance(touch1, touch2) {
        return {
            x: touch2.clientX - touch1.clientX,
            y: touch2.clientY - touch1.clientY
        };
    }

    // cal the length of distance
    function length(dis) {
        return Math.sqrt(dis.x * dis.x + dis.y * dis.y);
    }

    /**
     * Clip
     * @class
     * @param {Base64} src
     * @param {Object} opts
     */
    function Clip(src, opts) {
        this.cbs = {};
        this._init(src, opts);
    }
    var p = Clip.prototype;
    /**
     * _init
     * @private
     * @param {Base64} src
     */
    p._init = function (src, opts) {
        opts = opts || {};
        var $win = $(window),
            wWidth = $win.width(),
            wHeight = $win.height(),
            cancelBtnTpl = opts.cancelBtn,
            submitBtnTpl = opts.submitBtn;
        this.center = {
            left: wWidth / 2,
            top: wHeight / 2
        };
        this.maxTop = (wHeight - 380) / 2;
        this.maxLeft = (wWidth - 220) / 2;
        this.timer = null;

        // deal with cancel button template
        cancelBtnTpl ?
            // if it hasn't < and >, deal with template
            (~cancelBtnTpl.indexOf('<') && ~cancelBtnTpl.indexOf('>')) || (cancelBtnTpl = CANCEL_TPL.replace(/\{\{cancel\-word\}\}/, cancelBtnTpl)) :
            // just use default template
            (cancelBtnTpl = CANCEL_TPL.replace(/\{\{cancel\-word\}\}/, CANCEL_WORD));
        // deal with submit button template
        submitBtnTpl ?
            // if it hasn't < and >, deal with template
            (~submitBtnTpl.indexOf('<') && ~submitBtnTpl.indexOf('>')) || (submitBtnTpl = SUBMIT_TPL.replace(/\{\{submit\-word\}\}/, submitBtnTpl)) :
            // just use default template
            (submitBtnTpl = SUBMIT_TPL.replace(/\{\{submit\-word\}\}/, SUBMIT_WORD));


        var tpl = CONTAINER_TPL.replace(/\{\{margin\-top\}\}/, this.maxTop + 'px')
                .replace(/\{\{cancel\-btn\}\}/, cancelBtnTpl)
                .replace(/\{\{submit\-btn\}\}/, submitBtnTpl),
            $container = $(tpl)
                .appendTo(document.body),
            $touchHolder = $container.find('#touch-holder'),
            $img = $container.find('img'),
            img = $img[0],
            self = this, scale;

        img.onload = function () {
            self.width = self.oWidth = img.width;
            self.height = self.oHeight = img.height;
        };
        img.src = src;

        this.left = 0;
        this.top = 0;
        var $win = $(window);
        this.center = {
            left: $win.width() / 2,
            top: $win.height() / 2
        };
        // set all element
        this.$container = $container;
        this.$touchHolder = $touchHolder;
        this.$img = $img;
        this.$clipBox = $('#clip-box', $touchHolder);
        this.$submitBtn = $('#submit-clip', $touchHolder);
        this.$cancelBtn = $('#cancel-clip', $touchHolder);
        this._bindEvent(src);
        setTimeout(function () {
            self.emit('create');
        }, 0);
    };
    /**
     * _bindEvent
     * @private
     * @param {Base64} src
     */
    p._bindEvent = function (src) {
        var self = this;

        this._bindDrag();
        this._bindZoom();

        this.$submitBtn
            .on('touchstart', function (e) {
                e.stopPropagation();
                var offset = self.$clipBox.offset();
                self.destroy();
                // submit
                self.emit('submit', src, { x: offset.left - self.left, y: offset.top - self.top, scale: self.oWidth / self.width});
            });
        this.$cancelBtn
            .on('touchstart', function (e) {
                e.stopPropagation();
                self.destroy();
                // cancel
                self.emit('cancel');
            });
    };
    // 拖拽处理
    p._bindDrag = function () {
        var $img = this.$img,
            $touchHolder = this.$touchHolder,
            $container = this.$container,
            startTouch, lastTouch, self = this;

        $touchHolder
            .on('touchstart', function (e) {
                e.preventDefault();
                self._fixTopLeft();
                self._clearAnimate();
                if (e.touches.length !== 1) return (startTouch = undefined);
                startTouch = originTouch = $.extend({}, e.touches[0]);
            }).on('touchmove', function (e) {
                e.preventDefault();
                if (!startTouch) return;
                var curTouch = $.extend({}, e.touches[0]),
                    pos = distance(startTouch, curTouch);
                self.left += pos.x;
                self.top += pos.y;
                self._fixPos();
                $img.css('left', self.left + 'px')
                    .css('top', self.top + 'px');
                // reset the startTouch
                lastTouch = startTouch;
                startTouch = curTouch;
                timestmp = +new Date;
            }).on('touchend', function (e) {
                e.preventDefault();
                if (!startTouch) return;
                self.slip(lastTouch, startTouch);
                startTouch = undefined;
            });

    };
    // 缩放处理
    p._bindZoom = function () {
        var $img = this.$img,
            $touchHolder = this.$touchHolder,
            $container = this.$container,
            startTouches, self = this;

        $touchHolder
            .on('touchstart', function (e) {
                if (e.touches.length !== 2) return;
                startTouches = [$.extend({}, e.touches[0]), $.extend({}, e.touches[1])];
            }).on('touchmove', function (e) {
                if (!startTouches) return;
                var curTouches = [$.extend({}, e.touches[0]), $.extend({}, e.touches[1])];
                self.zoomByTouches(startTouches, curTouches);
                startTouches = curTouches;
            }).on('touchend', function (e) {
                if (!startTouches) return;
                startTouches = undefined;
            });
    };
    /**
     * _fixTopLeft
     * 不知道什么奇怪的bug，先这样fix一下
     */
    p._fixTopLeft = function () {
        if (typeof this.top !== 'number') {
            this.top = parseInt(this.$img.css('top'));
        }
        if (typeof this.left !== 'number') {
            this.left = parseInt(this.$img.css('left'));
        }
    };
    /**
     * _fixPos
     * fix the image's width, height, top and left
     * @returns {Boolean} fix or not
     */
    p._fixPos = function () {
        var scale, hasFix = false;
        // fix width
        if (this.width < 222) {
            scale = 222 / this.width;
            this.width = 222;
            this.height *= scale;
            hasFix = true;
        }
        // fix height
        if (this.height < 332) {
            scale = 332 / this.height;
            this.height = 332;
            this.width *= scale;
            hasFix = true;
        }
        // fix top-border
        if (this.top > this.maxTop) {
            this.top = this.maxTop;
            hasFix = true;
        }
        // fix bottom-border
        if (this.top + this.height < this.maxTop + 331) {
            this.top = this.maxTop + 331 - this.height;
            hasFix = true;
        }
        // fix left-border
        if (this.left > this.maxLeft) {
            this.left = this.maxLeft;
            hasFix = true;
        }
        // fix right-border
        if (this.left + this.width < this.maxLeft + 221) {
            this.left = this.maxLeft + 221 - this.width;
            hasFix = true;
        }
        return hasFix;
    };

    p._clearAnimate = function () {
        clearTimeout(this.timer);
        this.$img.css('transition', '');
    };
    // 4个点的位置来确定缩放效果
    p.zoomByTouches = function (startTouches, endTouches) {
        var dis1 = length(distance(startTouches[1], startTouches[0])),
            dis2 = length(distance(endTouches[1], endTouches[0])),
            scale = dis2 / dis1,
            x = (this.center.left - this.left) * scale,
            y = (this.center.top - this.top) * scale;

        this.width *= scale;
        this.height *= scale;
        this.left = this.center.left - x;
        this.top = this.center.top - y;
        this._fixPos();
        this.$img.width(this.width)
            .height(this.height)
            .css('left', this.left + 'px')
            .css('top', this.top + 'px');

    };
    // 2个点确定力度以及结束点
    p.slip = function (startTouch, endTouch, time) {
        var T = 20;
        // 默认常量
        time = time || 5;
        
        var dis = distance(startTouch, endTouch),
            l = length(dis),
            cos = dis.y / l,
            sin = dis.x / l
            v = l / time,
            dl = v * T,
            dx = dl * sin,
            dy = dl * cos,
            self = this;

        if (v < 1) return;

        this.$img.css('transition', 'all 600ms ease-out');
        this.timer = setTimeout(function () {
            self.left += dx;
            self.top += dy;
            self._fixPos();
            self.$img.css('left', self.left + 'px')
                .css('top', self.top + 'px');
        }, 0);
    };
    /**
     * destroy
     */
    p.destroy = function () {
        this.$container.remove();
        this.emit('destroy');
    };
    /**
     * on
     * @param {String} e
     * @param {Function} cb
     */
    p.on = function (e, cb) {
        (this.cbs[e] = this.cbs[e] || [])
            .push(cb);
        return this;
    };
    /**
     * emit
     * @param {String} e
     * @param {*...} args
     */
    p.emit = function (e, args) {
        var cbs = this.cbs[e], i = 0, l;
        if (cbs) {
            args = [].slice.call(arguments, 1);
            l = cbs.length;
            for (; i < l; i++) {
                cbs[i].apply(this, args);
            }
        }
    };

    return function (src, cb) {
        return new Clip(src, cb);
    };
});

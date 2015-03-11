clipPic
=====

> Web版的图片裁剪器。

### Duang

截图窗口：

![截图窗口](https://cloud.githubusercontent.com/assets/2239584/6593046/833b34f4-c80f-11e4-807a-5ee9834fa49a.png)

截图后展示：

![截图后展示](https://cloud.githubusercontent.com/assets/2239584/6593049/8b35793a-c80f-11e4-9765-e20514552a51.png)


### API

* clipPic(src, opts)

> 返回一个`ClipPic`实例。

`src` Base64图片
`opts` 可选参数，是一个对象		
`opts.cancelBtn` 取消按钮的模板
`opts.submitBtn` 提交按钮的模板

* ClipPic.prototype.on(e, cb)

> 事件绑定

`e` 事件名，目前只有：submit(提交)、cancel(取消)、create(剪切窗口创建完毕)、destroy(实例销毁)四个事件
`cb` 事件回调
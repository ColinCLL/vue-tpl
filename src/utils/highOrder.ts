/*
 * @Description: 高阶组件工具
 * @Author: 毛瑞
 * @Date: 2019-07-02 14:32:33
 */
import Vue, { Component, AsyncComponent, RenderContext } from 'vue'
import CONFIG from '@/config'

import Loading from '@com/Loading' // 加载中
import Info from '@com/Info' // 加载失败

/** 组件筛选器
 * @param {RenderContext} context vue渲染上下文
 * @param {IObject<Component>} components 组件字典
 *
 * @returns {String | Component} 匹配的组件名/组件
 */
type filter = (
  context: RenderContext,
  components?: IObject<Component>
) => string | Component | void

/** 根据is属性选择组件
 */
const filterByIS: filter = context => context.props.is || context.data.attrs?.is

/** 获取选择器(函数式组件)
 * @param {IObject<Component>} components 组件字典
 * @param {filter} filter 组件筛选器
 *
 * @returns {Component} 函数式组件
 */
function getChooser(
  components?: IObject<Component>,
  filter: filter = filterByIS
): Component {
  return {
    functional: true,
    render(createElement, context) {
      let Comp: any = filter(context, components)
      Comp = (components && components[Comp]) || Comp

      return Comp && createElement(Comp, context.data, context.children)
    },
  }
}

/** 选择器(函数式组件)
 * @prop {IObject<Component>} components 组件字典
 * @prop {filter} filter 组件筛选器
 */
const Chooser: Component = {
  functional: true,
  render(createElement, context) {
    const { components, filter = filterByIS } = context.props as {
      components?: IObject<Component>
      filter?: filter
    }

    let Comp: any = filter(context, components)
    Comp = (components && components[Comp]) || Comp

    return Comp && createElement(Comp, context.data, context.children)
  },
}

/** 获取带加载状态的【异步】组件包装
 * @param {Function} promiseFactory 异步组件, 比如: () => import('a')
 *    另: 第一次执行import方法就会开始下载chunk并返回Promise，成功后保存Promise下次直接返回
 *
 * @returns {Component} 函数式组件
 */
function getAsync(
  promiseFactory: () => Promise<Component | AsyncComponent>,
  loading: Component = Loading,
  error: Component = Info
): Component {
  const asyncComponentFactory = (): AsyncComponent => () => ({
    error, // 加载失败时
    loading, // 加载时
    component: promiseFactory() as any, // 目标
    timeout: CONFIG.timeout, // 加载超时（默认Infinity）
  })

  const observe = Vue.observable({ c: asyncComponentFactory() })
  const update = () => {
    observe.c = asyncComponentFactory()
  }

  return {
    functional: true,
    render(createElement, { data, children }) {
      // 保留 event: $ 用于 hack 加载失败时点击重新加载
      data.on || (data.on = {})
      data.on.$ = update

      return createElement(observe.c, data, children)
    },
  }
}

/* 示例1: 从指定组件中选择 (自由度高于 <Component /> )
<template>
  <Transition name="fade">
    <KeepAlive>
      <Chooser :is="is" :type="type"/>
    </KeepAlive>
  </Transition>
</template>

<script lang="ts">
import A from 'A'
import B from 'B'
const Chooser = getChooser({ A, B }) // 使用默认过滤器
const Chooser = getChooser(
  { A, B },
  (context: any): string => context.data.attrs.type || context.props.type
  ) // 自定义过滤器
const Chooser = getChooser({
  A,
  B: getChooser(
    { A, B },
    (context: any): string => context.data.attrs.type || context.props.type
  ),
 }) // 嵌套: 第一层使用默认过滤器的is属性, 第二层使用自定义的type属性

@Component({ components: { Chooser } })
export default class extends Vue {
  get is() {
    return 'B'
  }
  get type() {
    return 'A'
  }
}
</script>
*/

/* 示例2: 使用带加载状态的异步组件
<template>
  <AsyncComponent />
</template>

<script lang="ts">
@Component({
  components: {
    // 按规范命名哈 (多个异步组件合并到一个chunk用一样的名字)
    AsyncComponent: getAsync(/* webpackChunkName: "ocA" * / () => import('A')),
  },
})
export default class extends Vue {}
</script>
*/

/* 示例3: (・ω<) 组合1: 切换异步组件
<template>
  <Transition name="fade">
    <KeepAlive>
      <Chooser :is="is"/>
    </KeepAlive>
  </Transition>
</template>

<script lang="ts">
const Chooser = getChooser({
  A: getAsync(/* webpackChunkName: "oCom" * /() => import('A')),
  B: getAsync(/* webpackChunkName: "oCom" * / () => import('B')),
})

@Component({ components: { Chooser } })
export default class extends Vue {
  get is() {
    return 'A'
  }
}
</script>

组合2: 异步的高阶选择组件
// Chooser/index.ts
import A from 'A'
import B from 'B'
const Chooser = getChooser({ A, B }) // 使用默认过滤器

export default Chooser // 异步加载的时候必须是default

// SomeComponent.vue
<template>
  <AsyncComponent :is="is"/>
</template>

<script lang="ts">
@Component({
  components: {
    AsyncComponent:
      getAsync(/* webpackChunkName: "ocChooser" * / () => import('Chooser')),
  },
})
export default class extends Vue {
  get is() {
    return 'A'
  }
}
</script>
*/
// 更多...

export { filterByIS as filter, Chooser, getChooser, getAsync }

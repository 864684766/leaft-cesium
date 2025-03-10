import { defineComponent, onMounted, onUnmounted, ref, watch } from "vue";
import * as Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
// 使用CesiumUnminified版本而非Cesium.min.js，便于调试和错误追踪

/**
 * Cesium3D 组件
 * @description 基于Cesium实现的三维地球组件，支持地形、建筑物、天空盒等功能
 * @component
 */
export default defineComponent({
  name: "Cesium3D",
  props: {
    /**
     * 初始视角中心点
     * @description 设置地图初始化时的中心点位置，格式为[纬度, 经度]
     * @type {Array<number>}
     * @default [30.355764, 120.024029]
     * @example centerPoint={[39.9042, 116.4074]}
     */
    centerPoint: {
      type: Array,
      required: true,
      default: [30.355764, 120.024029],
    },
    /**
     * 初始高度（米）
     * @description 设置初始视角的高度，单位为米
     * @type {number}
     * @default 1000
     * @example height={2000}
     */
    height: {
      type: Number,
      default: 1000,
    },
    /**
     * 是否显示地形
     * @description 控制是否加载和显示地形数据
     * @type {boolean}
     * @default true
     * @example enableTerrain={false}
     */
    enableTerrain: {
      type: Boolean,
      default: true,
    },
    /**
     * 是否显示建筑物
     * @description 控制是否加载和显示3D建筑物模型
     * @type {boolean}
     * @default true
     * @example enable3DTiles={false}
     */
    enable3DTiles: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { expose }) {
    // 状态管理
    /** @type {import('vue').Ref<Cesium.Viewer|null>} 地图查看器实例 */
    const viewer = ref(null);
    /** @type {import('vue').Ref<boolean>} 资源加载状态 */
    const isLoading = ref(true);
    /** @type {import('vue').Ref<Object>} 3D瓦片集合 */
    const tilesets = ref({});
    /** @type {import('vue').Ref<boolean>} 资源是否已完全加载 */
    const resourcesLoaded = ref(false);

    /**
     * 天空盒配置
     * @description 定义不同类型天空盒的贴图资源和配置信息
     * @type {Object.<string, {name: string, config: Object}>}
     */
    const skyBoxConfigs = {
      starry: {
        name: "星空",
        config: {
          positiveX: "http://mars3d.cn/img/skybox/1/tycho2t3_80_px.jpg",
          negativeX: "http://mars3d.cn/img/skybox/1/tycho2t3_80_mx.jpg",
          positiveY: "http://mars3d.cn/img/skybox/1/tycho2t3_80_py.jpg",
          negativeY: "http://mars3d.cn/img/skybox/1/tycho2t3_80_my.jpg",
          positiveZ: "http://mars3d.cn/img/skybox/1/tycho2t3_80_pz.jpg",
          negativeZ: "http://mars3d.cn/img/skybox/1/tycho2t3_80_mz.jpg",
        },
      },
      sunset: {
        name: "黄昏",
        config: {
          positiveX: "http://mars3d.cn/img/skybox_near/wanxia/SunSetRight.png",
          negativeX: "http://mars3d.cn/img/skybox_near/wanxia/SunSetLeft.png",
          positiveY: "http://mars3d.cn/img/skybox_near/wanxia/SunSetFront.png",
          negativeY: "http://mars3d.cn/img/skybox_near/wanxia/SunSetBack.png",
          positiveZ: "http://mars3d.cn/img/skybox_near/wanxia/SunSetUp.png",
          negativeZ: "http://mars3d.cn/img/skybox_near/wanxia/SunSetDown.png",
        },
      },
      sunshine: {
        name: "晴天",
        config: {
          positiveX: new URL(
            "@/assets/img/sky-box/sunshine/px.png",
            import.meta.url
          ).href,
          negativeX: new URL(
            "@/assets/img/sky-box/sunshine/nx.png",
            import.meta.url
          ).href,
          positiveY: new URL(
            "@/assets/img/sky-box/sunshine/py.png",
            import.meta.url
          ).href,
          negativeY: new URL(
            "@/assets/img/sky-box/sunshine/ny.png",
            import.meta.url
          ).href,
          positiveZ: new URL(
            "@/assets/img/sky-box/sunshine/pz.png",
            import.meta.url
          ).href,
          negativeZ: new URL(
            "@/assets/img/sky-box/sunshine/nz.png",
            import.meta.url
          ).href,
        },
      },
      starry: {
        name: "星空",
        config: {
          positiveX: "http://mars3d.cn/img/skybox/1/tycho2t3_80_px.jpg",
          negativeX: "http://mars3d.cn/img/skybox/1/tycho2t3_80_mx.jpg",
          positiveY: "http://mars3d.cn/img/skybox/1/tycho2t3_80_py.jpg",
          negativeY: "http://mars3d.cn/img/skybox/1/tycho2t3_80_my.jpg",
          positiveZ: "http://mars3d.cn/img/skybox/1/tycho2t3_80_pz.jpg",
          negativeZ: "http://mars3d.cn/img/skybox/1/tycho2t3_80_mz.jpg",
        },
      },
      sunset: {
        name: "黄昏",
        config: {
          positiveX: "http://mars3d.cn/img/skybox_near/wanxia/SunSetRight.png",
          negativeX: "http://mars3d.cn/img/skybox_near/wanxia/SunSetLeft.png",
          positiveY: "http://mars3d.cn/img/skybox_near/wanxia/SunSetFront.png",
          negativeY: "http://mars3d.cn/img/skybox_near/wanxia/SunSetBack.png",
          positiveZ: "http://mars3d.cn/img/skybox_near/wanxia/SunSetUp.png",
          negativeZ: "http://mars3d.cn/img/skybox_near/wanxia/SunSetDown.png",
        },
      },
      bluesky: {
        name: "蓝天",
        config: {
          positiveX: "http://mars3d.cn/img/skybox/6/tycho2t3_80_px.jpg",
          negativeX: "http://mars3d.cn/img/skybox/6/tycho2t3_80_mx.jpg",
          positiveY: "http://mars3d.cn/img/skybox/6/tycho2t3_80_py.jpg",
          negativeY: "http://mars3d.cn/img/skybox/6/tycho2t3_80_my.jpg",
          positiveZ: "http://mars3d.cn/img/skybox/6/tycho2t3_80_pz.jpg",
          negativeZ: "http://mars3d.cn/img/skybox/6/tycho2t3_80_mz.jpg",
        },
      },
      night: {
        name: "夜晚",
        config: {
          positiveX: "http://mars3d.cn/img/skybox/2/tycho2t3_80_px.jpg",
          negativeX: "http://mars3d.cn/img/skybox/2/tycho2t3_80_mx.jpg",
          positiveY: "http://mars3d.cn/img/skybox/2/tycho2t3_80_py.jpg",
          negativeY: "http://mars3d.cn/img/skybox/2/tycho2t3_80_my.jpg",
          positiveZ: "http://mars3d.cn/img/skybox/2/tycho2t3_80_pz.jpg",
          negativeZ: "http://mars3d.cn/img/skybox/2/tycho2t3_80_mz.jpg",
        },
      },
      sunshine: {
        name: "晴天",
        config: {
          positiveX: new URL("@/assets/img/sky-box/sunshine/px.png", import.meta.url).href,
          negativeX: new URL("@/assets/img/sky-box/sunshine/nx.png", import.meta.url).href,
          positiveY: new URL("@/assets/img/sky-box/sunshine/py.png", import.meta.url).href,
          negativeY: new URL("@/assets/img/sky-box/sunshine/ny.png", import.meta.url).href,
          positiveZ: new URL("@/assets/img/sky-box/sunshine/pz.png", import.meta.url).href,
          negativeZ: new URL("@/assets/img/sky-box/sunshine/nz.png", import.meta.url).href,
        },
      },
    };

    /**
     * 初始化 Cesium Viewer
     * @description 创建并配置 Cesium 查看器实例，包括地形、图层和性能优化设置
     * @async
     * @returns {Promise<void>}
     */
    const initViewer = async () => {
      try {
        // 配置 Cesium Ion Token
        Cesium.Ion.defaultAccessToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwNjgzZDMzZi1mNGQ1LTQzZjItOTg0OC02OTU0NzNlZWVjZTYiLCJpZCI6Mjc5NjU2LCJpYXQiOjE3NDA3MTA3MjR9.ibywohFhqk7dJJk5F81Hc8ZSdxCmb1svxP8kTKmSPV4";

        // 添加性能优化配置
        viewer.value = new Cesium.Viewer("cesiumContainer", {
          creditContainer: document.createElement("div"), // 隐藏默认的版权信息容器
          terrainProvider: props.enableTerrain
            ? new Cesium.CesiumTerrainProvider({
                url: Cesium.IonResource.fromAssetId(1),
              })
            : undefined, // 根据配置决定是否启用地形
          baseLayerPicker: true, // 显示图层选择器
          geocoder: true, // 显示地理编码器
          homeButton: true, // 显示主页按钮
          sceneModePicker: true, // 显示场景模式选择器
          navigationHelpButton: true, // 显示帮助按钮
          animation: false, // 不显示动画控件
          timeline: false, // 不显示时间线控件
          fullscreenButton: true, // 显示全屏按钮
          imageryProvider: new Cesium.IonImageryProvider({ assetId: 3 }), // 设置默认影像图层
          navigationInstructionsInitiallyVisible: false, // 初始不显示导航说明
          selectionIndicator: false, // 不显示选择指示器
          infoBox: false, // 不显示信息框
          // 性能优化相关配置
          requestRenderMode: true, // 仅在需要时渲染场景，减少不必要的渲染
          maximumRenderTimeChange: Infinity, // 无限制最大渲染时间变化，避免频繁更新
          targetFrameRate: 60, // 设置目标帧率为60fps
          resolutionScale: 0.8, // 将渲染分辨率降低到80%以提高性能
          // 禁用不必要的特性以提升性能
          shadows: false, // 禁用阴影
          fog: false, // 禁用雾效果
        });

        // 设置场景性能参数
        const scene = viewer.value.scene;
        scene.fog.enabled = false; // 禁用场景雾效果
        scene.skyAtmosphere.show = false; // 禁用天空大气效果
        scene.globe.showGroundAtmosphere = false; // 禁用地面大气效果
        scene.globe.enableLighting = false; // 禁用全球光照

        // 优化内存使用
        scene.globe.maximumScreenSpaceError = 2; // 降低地形细节级别，减少内存占用
        scene.globe.tileCacheSize = 100; // 限制瓦片缓存大小，防止内存溢出

        // 优化 GPU 使用
        scene.logarithmicDepthBuffer = false; // 禁用对数深度缓冲，减少GPU负担
        scene.globe.baseColor = Cesium.Color.WHITE; // 设置地球基础颜色

        // 设置更激进的视锥体剔除
        scene.globe.cullWithChildrenBounds = true; // 启用子节点包围盒剔除，提高渲染效率

        // 设置帧率限制
        scene.frameState.maximumMemoryUsage = 512; // 限制最大内存使用为512MB
        scene.preRender.addEventListener(() => {
          // 根据相机俯仰角动态调整屏幕空间误差，优化性能
          scene.globe.maximumScreenSpaceError = scene.camera.pitch < 0 ? 4 : 2;
        });
      } catch (error) {
        console.error("初始化 Viewer 失败:", error);
      }
    };

    /**
     * 配置场景效果
     * @description 设置场景的视觉效果，包括底图颜色、光照和地形深度测试
     * @returns {void}
     */
    const configureSceneEffects = () => {
      if (!viewer.value) return;

      // 设置底图背景色
      viewer.value.scene.globe.baseColor = Cesium.Color.BLACK;

      // 启用光照效果
      viewer.value.scene.globe.enableLighting = true;

      // 启用地形深度测试
      viewer.value.scene.globe.depthTestAgainstTerrain = true;
    };

    /**
     * 设置相机视角
     * @description 配置相机的位置和方向，实现视角的精确控制
     * @param {number[]} position - [纬度, 经度]数组
     * @param {number} height - 视角高度（米）
     * @returns {void}
     */
    const setCameraView = (position, height) => {
      if (!viewer.value) return;

      viewer.value.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          position[1],
          position[0],
          height
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-45.0),
          roll: 0.0,
        },
        endTransform: Cesium.Matrix4.IDENTITY,
        duration: 0,
      });
    };

    /**
     * 配置相机控制器
     * @description 设置相机的交互控制方式，包括缩放和倾斜控制
     * @returns {void}
     */
    const configureCameraController = () => {
      if (!viewer.value) return;

      // 配置缩放事件类型
      viewer.value.scene.screenSpaceCameraController.zoomEventTypes = [
        Cesium.CameraEventType.WHEEL,
        Cesium.CameraEventType.PINCH,
      ];

      // 禁用默认倾斜控制
      viewer.value.scene.screenSpaceCameraController.tiltEventTypes = [];
    };

    /**
     * 设置鼠标交互
     * @description 配置自定义的鼠标交互行为，包括右键拖动视角等功能
     * @returns {void}
     */
    const setupMouseInteraction = () => {
      if (!viewer.value) return;

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.value.canvas);
      let mouseMoveHandler = null;

      // 配置右键拖动控制视角
      handler.setInputAction((movement) => {
        const camera = viewer.value.camera;
        const startPosition = movement.position;
        const startPitch = camera.pitch;
        const startHeading = camera.heading;

        // 确保之前的 mouseMoveHandler 被清理
        if (mouseMoveHandler) {
          mouseMoveHandler.destroy();
        }

        mouseMoveHandler = new Cesium.ScreenSpaceEventHandler(viewer.value.canvas);

        // 处理鼠标移动
        mouseMoveHandler.setInputAction((moveMovement) => {
          if (!viewer.value) return;
          
          const deltaY = moveMovement.endPosition.y - startPosition.y;
          const deltaX = moveMovement.endPosition.x - startPosition.x;

          const newPitch = startPitch + Cesium.Math.toRadians(deltaY * 0.1);
          const newHeading = startHeading - Cesium.Math.toRadians(deltaX * 0.1);

          const clampedPitch = Cesium.Math.clamp(
            newPitch,
            -Cesium.Math.PI_OVER_TWO + 0.1,
            0
          );

          camera.setView({
            orientation: {
              heading: newHeading,
              pitch: clampedPitch,
              roll: camera.roll,
            },
          });
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // 清理事件监听
        const cleanupMouseHandler = () => {
          if (mouseMoveHandler && !mouseMoveHandler.isDestroyed()) {
            mouseMoveHandler.destroy();
            mouseMoveHandler = null;
          }
        };

        handler.setInputAction(cleanupMouseHandler, Cesium.ScreenSpaceEventType.LEFT_UP);
        handler.setInputAction(cleanupMouseHandler, Cesium.ScreenSpaceEventType.RIGHT_UP);
      }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);

      // 在组件卸载时清理
      onUnmounted(() => {
        if (handler && !handler.isDestroyed()) {
          handler.destroy();
        }
        if (mouseMoveHandler && !mouseMoveHandler.isDestroyed()) {
          mouseMoveHandler.destroy();
        }
      });
    };

    /**
     * 加载3D瓦片模型
     * @description 加载并配置3D建筑物模型，包括地图底图和建筑物模型
     * @async
     * @returns {Promise<void>}
     */
    const load3DTilesets = async () => {
      if (!viewer.value || !props.enable3DTiles) return;

      try {
        isLoading.value = true;

        // 加载地图底图
        const mapResource = await Cesium.IonResource.fromAssetId(2275207);
        const mapTileset = await Cesium.Cesium3DTileset.fromUrl(mapResource, {
          maximumScreenSpaceError: 24,
          maximumMemoryUsage: 512,
          skipLevelOfDetail: true,
          baseScreenSpaceError: 1024,
          skipScreenSpaceErrorFactor: 16,
          skipLevels: 1,
        });

        // 加载建筑物模型
        const buildingResource = await Cesium.IonResource.fromAssetId(96188);
        const buildingTileset = await Cesium.Cesium3DTileset.fromUrl(
          buildingResource,
          {
            maximumScreenSpaceError: 24,
            maximumMemoryUsage: 512,
            skipLevelOfDetail: true,
          }
        );

        // 添加到场景
        viewer.value.scene.primitives.add(mapTileset);
        viewer.value.scene.primitives.add(buildingTileset);

        // 监听加载完成
        let tilesLoaded = 0;
        const checkLoadingComplete = () => {
          tilesLoaded++;
          if (tilesLoaded >= 2) {
            isLoading.value = false;
          }
        };

        mapTileset.tileLoad.addEventListener(checkLoadingComplete);
        buildingTileset.tileLoad.addEventListener(checkLoadingComplete);
      } catch (error) {
        console.error("加载3D模型失败:", error);
        isLoading.value = false;
      }
    };

    /**
     * 切换天空盒
     * @description 根据指定类型更改场景的天空盒效果
     * @param {string} type - 天空盒类型
     * @returns {void}
     */
    const changeSkyBox = (type) => {
      if (!viewer.value) return;

      const config = skyBoxConfigs[type]?.config;
      if (!config) return;

      viewer.value.scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: config.positiveX,
          negativeX: config.negativeX,
          positiveY: config.positiveY,
          negativeY: config.negativeY,
          positiveZ: config.positiveZ,
          negativeZ: config.negativeZ,
        },
      });
    };

    /**
     * 添加管线数据
     * @description 在场景中添加管线实体，支持自定义颜色和样式
     * @param {Array<{name: string, coordinates: number[], color: string}>} data - 管线数据数组
     * @returns {void}
     */
    const addPipelines = (data) => {
      if (!viewer.value) return;

      data.forEach((pipeline) => {
        viewer.value.entities.add({
          name: pipeline.name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(
              pipeline.coordinates
            ),
            width: 2,
            material: new Cesium.PolylineOutlineMaterialProperty({
              color: Cesium.Color.fromCssColorString(pipeline.color),
              outlineWidth: 1,
              outlineColor: Cesium.Color.WHITE,
            }),
          },
        });
      });
    };

    /**
     * 切换地图模式
     * @description 在2D、3D和2.5D模式之间切换
     * @param {'2D'|'3D'|'2.5D'} mode - 地图模式
     * @returns {void}
     */
    const switchMapMode = (mode) => {
      if (!viewer.value) return;

      switch (mode) {
        case "2D":
          viewer.value.scene.morphTo2D(1.0);
          break;
        case "3D":
          viewer.value.scene.morphTo3D(1.0);
          break;
        case "2.5D":
          viewer.value.scene.morphToColumbusView(1.0);
          break;
      }
    };

    /**
     * 清理资源
     * @description 销毁viewer和清理相关资源，防止内存泄漏
     * @returns {void}
     */
    const cleanup = () => {
      if (viewer.value) {
        viewer.value.destroy();
        viewer.value = null;
      }
    };

    /**
     * 优化相机移动性能
     * @description 添加相机移动节流和性能优化，提升移动过程中的渲染性能
     * @returns {void}
     */
    const optimizeCameraMovement = () => {
      if (!viewer.value) return;

      const scene = viewer.value.scene;

      // 添加相机移动事件节流
      let movementTimeout;
      scene.camera.changed.addEventListener(() => {
        scene.globe.maximumScreenSpaceError = 4; // 移动时降低精度

        clearTimeout(movementTimeout);
        movementTimeout = setTimeout(() => {
          scene.globe.maximumScreenSpaceError = 2; // 停止移动后恢复精度
        }, 250);
      });
    };

    // 生命周期钩子
    onMounted(async () => {
      await initViewer(); // 初始化地图查看器
      configureSceneEffects(); // 配置场景效果
      setCameraView(props.centerPoint, props.height); // 设置初始视角
      configureCameraController(); // 配置相机控制
      setupMouseInteraction(); // 设置鼠标交互
      optimizeCameraMovement(); // 添加相机移动优化
      await load3DTilesets(); // 加载3D模型
    });

    onUnmounted(() => {
      cleanup(); // 组件卸载时清理资源
    });

    // 暴露方法给父组件
    expose({
      addPipelines, // 添加管线数据
      switchMapMode, // 切换地图模式
      changeSkyBox, // 切换天空盒
      getViewer: () => viewer.value, // 获取viewer实例
    });

    return () => (
      <div class="relative w-full h-[80vh]">
        <div id="cesiumContainer" class="w-full h-full"></div>
        <select
          class="absolute top-34 right-4 px-4 py-2 bg-white rounded-lg shadow-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => changeSkyBox(e.target.value)}
        >
          <option value="">选择天空盒</option>
          {Object.entries(skyBoxConfigs).map(([key, value]) => (
            <option key={key} value={key}>
              {value.name}
            </option>
          ))}
        </select>
        {isLoading.value && (
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
            <div class="bg-white p-4 rounded-lg shadow-lg text-center">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
              <p class="text-gray-700">加载3D地图中，请稍候...</p>
            </div>
          </div>
        )}
      </div>
    );
  },
});

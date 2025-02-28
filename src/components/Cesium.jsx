import { defineComponent, onMounted, onUnmounted, ref, watch } from "vue";
import * as Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
// 使用CesiumUnminified版本而非Cesium.min.js，便于调试和错误追踪

export default defineComponent({
  name: "Cesium3D",
  props: {
    /**
     * 初始视角中心点
     */
    centerPoint: {
      type: Array,
      required: true,
      default: [30.355764, 120.024029],
    },
    /**
     * 初始高度（米）
     */
    height: {
      type: Number,
      default: 1000,
    },
    /**
     * 是否显示地形
     */
    enableTerrain: {
      type: Boolean,
      default: true,
    },
    /**
     * 是否显示建筑物
     */
    enable3DTiles: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { expose }) {
    // 状态管理
    const viewer = ref(null);
    const isLoading = ref(true);
    const tilesets = ref({});
    const resourcesLoaded = ref(false);

    /**
     * 天空盒配置
     * @description 定义不同类型天空盒的贴图资源
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
    };

    /**
     * 初始化 Cesium Viewer
     * @description 创建并配置 Cesium 查看器实例
     * @returns {Promise<void>}
     */
    const initViewer = async () => {
      try {
        // 配置 Cesium Ion Token
        Cesium.Ion.defaultAccessToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwNjgzZDMzZi1mNGQ1LTQzZjItOTg0OC02OTU0NzNlZWVjZTYiLCJpZCI6Mjc5NjU2LCJpYXQiOjE3NDA3MTA3MjR9.ibywohFhqk7dJJk5F81Hc8ZSdxCmb1svxP8kTKmSPV4";

        // 添加性能优化配置
        viewer.value = new Cesium.Viewer("cesiumContainer", {
          creditContainer: document.createElement("div"),
          terrainProvider: props.enableTerrain
            ? new Cesium.CesiumTerrainProvider({
                url: Cesium.IonResource.fromAssetId(1),
              })
            : undefined,
          baseLayerPicker: true,
          geocoder: true,
          homeButton: true,
          sceneModePicker: true,
          navigationHelpButton: true,
          animation: false,
          timeline: false,
          fullscreenButton: true,
          imageryProvider: new Cesium.IonImageryProvider({ assetId: 3 }),
          navigationInstructionsInitiallyVisible: false,
          selectionIndicator: false,
          infoBox: false,
          // 性能优化相关配置
          requestRenderMode: true, // 仅在需要时渲染场景
          maximumRenderTimeChange: Infinity, // 无限制最大渲染时间变化
          targetFrameRate: 60, // 目标帧率
          resolutionScale: 0.8, // 降低分辨率以提高性能

          // 禁用不必要的特性
          shadows: false,
          fog: false,
        });

        // 设置场景性能参数
        const scene = viewer.value.scene;
        scene.fog.enabled = false;
        scene.skyAtmosphere.show = false;
        scene.globe.showGroundAtmosphere = false;
        scene.globe.enableLighting = false;

        // 优化内存使用
        scene.globe.maximumScreenSpaceError = 2; // 降低地形细节
        scene.globe.tileCacheSize = 100; // 限制缓存大小

        // 优化 GPU 使用
        scene.logarithmicDepthBuffer = false;
        scene.globe.baseColor = Cesium.Color.WHITE;

        // 设置更激进的视锥体剔除
        scene.globe.cullWithChildrenBounds = true;

        // 设置帧率限制
        scene.frameState.maximumMemoryUsage = 512; // 限制最大内存使用
        scene.preRender.addEventListener(() => {
          scene.globe.maximumScreenSpaceError = scene.camera.pitch < 0 ? 4 : 2;
        });
      } catch (error) {
        console.error("初始化 Viewer 失败:", error);
      }
    };

    /**
     * 配置场景效果
     * @description 设置场景的视觉效果，包括光照、地形等
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
     * @description 配置初始视角位置和方向
     * @param {number[]} position - [经度, 纬度] 数组
     * @param {number} height - 视角高度（米）
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
     * @description 设置相机的交互控制方式
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
     * @description 配置自定义的鼠标交互行为
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
     * @description 加载并配置3D建筑物模型
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
     * @description 更改场景的天空盒效果
     * @param {string} type - 天空盒类型
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
     * @description 在场景中添加管线实体
     * @param {Array} data - 管线数据数组
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
     * @description 销毁viewer和清理相关资源
     */
    const cleanup = () => {
      if (viewer.value) {
        viewer.value.destroy();
        viewer.value = null;
      }
    };

    /**
     * 优化相机移动性能
     * @description 添加相机移动节流和性能优化
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
      await initViewer();
      configureSceneEffects();
      setCameraView(props.centerPoint, props.height);
      configureCameraController();
      setupMouseInteraction();
      optimizeCameraMovement(); // 添加相机移动优化
      await load3DTilesets();
    });

    onUnmounted(() => {
      cleanup();
    });

    // 暴露方法给父组件
    expose({
      addPipelines,
      switchMapMode,
      changeSkyBox,
      getViewer: () => viewer.value,
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

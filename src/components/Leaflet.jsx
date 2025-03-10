/**
 * @file Leaflet.jsx
 * @description Leaflet地图组件，基于Leaflet库实现的Vue3地图组件
 * @module components/Leaflet
 */

// Vue相关依赖
import { defineComponent, onMounted, ref } from "vue";

// Leaflet核心库及工具
import L from "leaflet";
import "leaflet-geometryutil"; // 引入几何计算工具

// 样式文件
import "leaflet/dist/leaflet.css"; // Leaflet核心样式
import "leaflet-draw/dist/leaflet.draw.css"; // 绘制工具样式
import "leaflet-fullscreen/dist/leaflet.fullscreen.css"; // 全屏控件样式

// 点位聚合相关
import "leaflet.markercluster/dist/MarkerCluster.css"; // 聚合样式
import "leaflet.markercluster/dist/MarkerCluster.Default.css"; // 聚合默认主题
import "leaflet.markercluster"; // 聚合功能

// 扩展插件
import "leaflet-draw"; // 绘制工具
import "leaflet-fullscreen"; // 全屏控件

export default defineComponent({
  name: "LeafletMap",
  props: {
    /**
     * 地图缩放等级
     * @description 控制地图的缩放级别，值越大显示的细节越多
     * @type {number}
     * @default 13
     * @example mapLevel={15}
     */
    /**
     * 地图缩放等级
     * @description 控制地图的缩放级别，值越大显示的细节越多
     * @type {number}
     * @default 13
     * @example mapLevel={15}
     */
    mapLevel: {
      type: Number,
      required: true,
      default: 13,
    },
    /**
     * 地图中心点坐标
     * @description 设置地图初始化时的中心点位置，格式为[纬度, 经度]
     * @type {Array<number>}
     * @default [30.355764, 120.024029]
     * @example centerPoint={[39.9042, 116.4074]}
     */
    /**
     * 地图中心点坐标
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
     * 是否启用点位聚合
     * @description 当地图上有大量标记点时，是否将它们聚合显示
     * @type {boolean}
     * @default true
     */
    /**
     * 是否启用点位聚合
     * @description 当地图上有大量标记点时，是否将它们聚合显示
     * @type {boolean}
     * @default true
     */
    enableClustering: {
      type: Boolean,
      default: true,
    },
    /**
     * 聚合半径
     * @description 点位聚合的范围半径（像素），值越大聚合范围越大
     * @type {number}
     * @default 80
     */
    /**
     * 聚合半径
     * @description 点位聚合的范围半径（像素），值越大聚合范围越大
     * @type {number}
     * @default 80
     */
    clusterRadius: {
      type: Number,
      default: 80,
    },
    /**
     * 是否显示鼠标位置坐标
     * @description 在地图上移动鼠标时，是否显示当前位置的经纬度坐标
     * @type {boolean}
     * @default true
     */
    /**
     * 是否显示鼠标位置坐标
     * @description 在地图上移动鼠标时，是否显示当前位置的经纬度坐标
     * @type {boolean}
     * @default true
     */
    showMousePosition: {
      type: Boolean,
      default: true,
    },
    /**
     * 底图类型
     * @description 选择地图底图样式，可选值：standard（标准）、satellite（卫星）、terrain（地形）、traffic（交通）
     * @type {string}
     * @default "standard"
     */
    /**
     * 底图类型
     * @description 选择地图底图样式，可选值：standard（标准）、satellite（卫星）、terrain（地形）、traffic（交通）
     * @type {string}
     * @default "standard"
     */
    baseMapType: {
      type: String,
      default: "standard",
    },
    /**
     * 是否启用绘制工具
     * @description 是否显示绘制工具栏，支持绘制点、线、面等要素
     * @type {boolean}
     * @default true
     */
    /**
     * 是否启用绘制工具
     * @description 是否显示绘制工具栏，支持绘制点、线、面等要素
     * @type {boolean}
     * @default true
     */
    enableDraw: {
      type: Boolean,
      default: true,
    },
    /**
     * 是否启用测量工具
     * @description 是否启用距离和面积测量功能
     * @type {boolean}
     * @default true
     */
    /**
     * 是否启用测量工具
     * @description 是否启用距离和面积测量功能
     * @type {boolean}
     * @default true
     */
    enableMeasure: {
      type: Boolean,
      default: true,
    },
  },
  /**
   * 组件逻辑设置
   * @param {Object} props - 组件属性
   * @param {Object} context - 上下文对象，包含expose和emit方法
   * @returns {Object} 返回组件的渲染函数和响应式数据
   */
  setup(props, { expose, emit }) {
    // 响应式状态管理
    const map = ref(null); // Leaflet地图实例
    const mousePosition = ref(null); // 鼠标位置坐标
    const drawnItems = ref(null); // 绘制的图形图层组
    const drawControl = ref(null); // 绘制控件实例

    /**
     * 底图配置对象
     * @description 定义不同类型底图的URL和配置选项
     * @type {Object}
     */
    const baseMaps = {
      standard: {
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        options: {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        },
      },
      satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        options: {
          attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
          maxZoom: 19,
        },
      },
      terrain: {
        url: "https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg",
        options: {
          attribution: '&copy; <a href="https://stamen.com">Stamen</a>',
          maxZoom: 18,
        },
      },
      traffic: {
        url: "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=YOUR_API_KEY",
        options: {
          attribution:
            '&copy; <a href="https://www.thunderforest.com">Thunderforest</a>',
          maxZoom: 19,
        },
      },
    };

    /**
     * 初始化绘制工具
     * @description 根据props配置初始化地图的绘制和测量工具
     * @function
     * @returns {void}
     */
    const initDrawTools = () => {
      console.log("Initializing draw tools, enableDraw:", props.enableDraw);
      if (!props.enableDraw && !props.enableMeasure) {
        console.log("Draw and measure tools are disabled.");
        return;
      }

      drawnItems.value = new L.FeatureGroup();
      map.value.addLayer(drawnItems.value);

      const drawOptions = {
        position: "topleft",
        draw: {
          polyline: props.enableMeasure
            ? {
                shapeOptions: {
                  color: "#f357a1",
                  weight: 3,
                },
                showLength: true,
                metric: true,
                repeatMode: false,
              }
            : false,
          polygon: props.enableMeasure
            ? {
                allowIntersection: true,
                showArea: true,
                showLength: true,
                metric: true,
                shapeOptions: {
                  color: "#f357a1",
                },
                repeatMode: false,
                completeOnBlur: false,
                finishOn: "dblclick",
                drawError: {
                  color: "#e1e100",
                  message: "<strong>错误</strong> 多边形不能自相交！",
                },
                guidelineDistance: 20,
                maxPoints: null, // 允许任意数量的点
                showLength: true,
                zIndexOffset: 2000,
              }
            : false,
          circle: props.enableDraw
            ? {
                shapeOptions: {
                  color: "#f357a1",
                },
                showRadius: true,
                metric: true,
                repeatMode: false,
              }
            : false,
          marker: props.enableDraw,
          circlemarker: false,
          rectangle: props.enableDraw
            ? {
                shapeOptions: {
                  color: "#f357a1",
                  weight: 2,
                  opacity: 0.7,
                },
                showArea: false,
                metric: true,
                repeatMode: false,
                allowIntersection: false,
                drawError: {
                  color: "#e1e100",
                  message: "<strong>错误</strong> 矩形不能自相交！",
                },
                // 添加面积计算配置
                area: {
                  enabled: true,
                  metric: true,
                  imperial: false,
                },
              }
            : false,
        },
        edit: {
          featureGroup: drawnItems.value,
          remove: true,
        },
      };

      drawControl.value = new L.Control.Draw(drawOptions);
      map.value.addControl(drawControl.value);

      // 监听绘制完成事件
      map.value.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        drawnItems.value.addLayer(layer);

        // 如果是测量功能，添加测量结果
        if (
          props.enableMeasure ||
          event.layerType === "circle" ||
          event.layerType === "rectangle"
        ) {
          let measurementText = "";
          if (event.layerType === "polyline") {
            const distance = calculateDistance(layer);
            measurementText = `距离: ${distance.toFixed(2)} 米`;
          } else if (
            event.layerType === "polygon" ||
            event.layerType === "rectangle"
          ) {
            const area = calculateArea(layer, event.layerType);
            measurementText = `面积: ${area.toFixed(2)} 平方米`;
          } else if (event.layerType === "circle") {
            const area = calculateArea(layer, event.layerType);
            measurementText = `面积: ${area.toFixed(2)} 平方米`;
          }
          if (measurementText) {
            layer.bindPopup(measurementText).openPopup();
          }
        }
      });

      // 监听删除事件
      drawnItems.value.on("layerremove", (event) => {
        const layer = event.layer;

        // 先关闭弹出框，再移除
        if (layer._popup) {
          layer._popup.close();
          layer._popup.remove();
          layer._popup = null;
        }

        // 确保图层从地图上完全移除
        if (map.value.hasLayer(layer)) {
          map.value.removeLayer(layer);
        }

        // 清理图层上的所有事件监听器
        layer.off();
      });

      // 监听地图缩放开始事件，暂时关闭所有弹出框
      map.value.on("zoomstart", () => {
        drawnItems.value.eachLayer((layer) => {
          if (layer._popup && layer._popup.isOpen()) {
            layer._popup.close();
          }
        });
      });

      // 监听地图缩放结束事件，重新打开弹出框
      map.value.on("zoomend", () => {
        drawnItems.value.eachLayer((layer) => {
          if (layer._popup) {
            layer._popup.update();
          }
        });
      });
    };

    /**
     * 计算距离
     */
    const calculateDistance = (layer) => {
      const latlngs = layer.getLatLngs();
      let distance = 0;
      for (let i = 1; i < latlngs.length; i++) {
        distance += latlngs[i - 1].distanceTo(latlngs[i]);
      }
      return distance;
    };

    /**
     * 计算多边形面积
     * @param {L.Layer} layer - Leaflet图层对象
     * @returns {number} 面积（平方米）
     */
    const calculatePolygonArea = (layer) => {
      const latlngs = layer.getLatLngs()[0];
      return L.GeometryUtil.geodesicArea(latlngs);
    };

    /**
     * 计算圆形面积
     * @param {L.Circle} circle - Leaflet圆形对象
     * @returns {number} 面积（平方米）
     */
    const calculateCircleArea = (circle) => {
      const radius = circle.getRadius(); // 获取半径（米）
      return Math.PI * radius * radius;
    };

    /**
     * 计算矩形面积
     * @param {L.Rectangle} rectangle - Leaflet矩形对象
     * @returns {number} 面积（平方米）
     */
    const calculateRectangleArea = (rectangle) => {
      const bounds = rectangle.getBounds();
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();

      // 使用GeometryUtil计算矩形四个顶点构成的多边形面积
      return L.GeometryUtil.geodesicArea([
        northEast,
        L.latLng(northEast.lat, southWest.lng),
        southWest,
        L.latLng(southWest.lat, northEast.lng),
      ]);
    };

    /**
     * 根据图形类型计算面积
     * @param {L.Layer} layer - Leaflet图层对象
     * @param {string} layerType - 图层类型
     * @returns {number} 面积（平方米）
     */
    const calculateArea = (layer, layerType) => {
      switch (layerType) {
        case "polygon":
          return calculatePolygonArea(layer);
        case "circle":
          return calculateCircleArea(layer);
        case "rectangle":
          return calculateRectangleArea(layer);
        default:
          console.warn("不支持的图形类型:", layerType);
          return 0;
      }
    };

    /**
     * 添加点位并根据配置进行聚合
     */
    const addMarkersWithClustering = (map, points) => {
      if (props.enableClustering) {
        const markers = L.markerClusterGroup({
          maxClusterRadius: props.clusterRadius,
        });
        points.forEach((point) => {
          L.marker(point).addTo(markers);
        });
        map.addLayer(markers);
      } else {
        points.forEach((point) => {
          L.marker(point).addTo(map);
        });
      }
    };

    /**
     * 加载视野范围内的数据
     */
    const loadDataInBounds = (mapEvent) => {
      var bounds = mapEvent.getBounds();
      // 这里需要根据实际的后端接口来发送请求加载数据
      console.log("加载视野范围内的数据:", bounds);
    };

    /**
     * 切换底图
     */
    const switchBaseMap = (type) => {
      if (!map.value || !baseMaps[type]) return;

      // 移除现有底图
      map.value.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.value.removeLayer(layer);
        }
      });

      // 添加新底图
      const baseMap = baseMaps[type];
      L.tileLayer(baseMap.url, baseMap.options).addTo(map.value);
    };

    /**
     * 更新鼠标位置
     */
    /**
     * 更新鼠标位置坐标
     * @description 根据鼠标移动事件更新当前鼠标所在位置的经纬度坐标
     * @function
     * @param {L.MouseEvent} e - Leaflet鼠标事件对象
     * @returns {void}
     */
    const updateMousePosition = (e) => {
      if (props.showMousePosition) {
        mousePosition.value = `${e.latlng.lat.toFixed(
          6
        )}, ${e.latlng.lng.toFixed(6)}`;
      }
    };

    /**
     * 搜索控件配置
     */
    const searchControl = ref(null);

    /**
     * 初始化搜索控件
     */
    const initSearchControl = () => {
      const searchOptions = {
        position: "topleft",
        placeholder: "搜索地点、坐标...",
        async searchFn(text) {
          try {
            // 尝试解析坐标
            const coords = parseCoordinates(text);
            if (coords) {
              return [
                {
                  name: `坐标: ${coords.lat}, ${coords.lng}`,
                  location: coords,
                },
              ];
            }

            // 使用 Nominatim 服务进行地理编码搜索
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                text
              )}`
            );
            const data = await response.json();

            return data.map((item) => ({
              name: item.display_name,
              location: {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              },
            }));
          } catch (error) {
            console.error("搜索出错:", error);
            return [];
          }
        },
        onResultClick(result) {
          const { location } = result;
          map.value.setView([location.lat, location.lng], 16);
          L.marker([location.lat, location.lng])
            .addTo(map.value)
            .bindPopup(result.name)
            .openPopup();
        },
      };

      searchControl.value = L.control.custom(searchOptions);
      map.value.addControl(searchControl.value);
    };

    /**
     * 解析坐标字符串
     */
    const parseCoordinates = (text) => {
      // 支持多种坐标格式
      const patterns = [
        /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/, // 纬度,经度
        /^(-?\d+°\s*\d+'?\s*\d+(\.\d+)?"?\s*[NS])\s*,?\s*(-?\d+°\s*\d+'?\s*\d+(\.\d+)?"?\s*[EW])$/, // DMS格式
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          if (pattern.toString().includes("NS")) {
            // 处理DMS格式
            return {
              lat: parseDMS(match[1]),
              lng: parseDMS(match[3]),
            };
          } else {
            // 处理十进制格式
            return {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
            };
          }
        }
      }
      return null;
    };

    /**
     * 解析DMS(度分秒)格式
     */
    const parseDMS = (dms) => {
      const parts = dms.match(
        /(\d+)°\s*(\d+)?'?\s*(\d+(\.\d+)?)?"?\s*([NS]|[EW])/i
      );
      if (!parts) return null;

      const degrees = parseInt(parts[1]);
      const minutes = parts[2] ? parseInt(parts[2]) : 0;
      const seconds = parts[3] ? parseFloat(parts[3]) : 0;
      const direction = parts[5].toUpperCase();

      let dd = degrees + minutes / 60 + seconds / 3600;
      if (direction === "S" || direction === "W") dd = -dd;

      return dd;
    };

    // 在initMap函数中添加初始化搜索控件
    /**
     * 初始化地图实例
     * @description 创建Leaflet地图实例，设置初始视图和底图
     * @function
     * @returns {void}
     */
    const initMap = () => {
      // 创建地图实例
      map.value = L.map("map", {
        center: props.centerPoint,
        zoom: props.mapLevel,
        zoomControl: false,
        fullscreenControl: true,
      });

      // 添加缩放控件到右上角
      L.control
        .zoom({
          position: "topright",
        })
        .addTo(map.value);

      // 添加比例尺
      L.control
        .scale({
          imperial: false,
          position: "bottomright",
        })
        .addTo(map.value);

      // 设置初始底图
      switchBaseMap(props.baseMapType);

      // 初始化绘制工具
      initDrawTools();

      // 模拟点位数据
      const points = [];
      for (let i = 0; i < 10000; i++) {
        const lat = 30.355764 + (Math.random() - 0.5) * 0.1;
        const lng = 120.024029 + (Math.random() - 0.5) * 0.1;
        points.push([lat, lng]);
      }

      // 添加点位
      addMarkersWithClustering(map.value, points);

      // 注册事件
      eventRegister(map.value);
    };

    /**
     * 事件注册
     */
    const eventRegister = (map) => {
      map.on("moveend", () => loadDataInBounds(map));
      map.on("zoomend", () => loadDataInBounds(map));
    };

    // 暴露方法给父组件
    expose({
      switchBaseMap,
      getMap: () => map.value,
      getDrawnItems: () => drawnItems.value,
    });

    /**
     * 组件挂载生命周期钩子
     * @description 在组件挂载完成后初始化地图和相关工具
     * @lifecycle
     */
    onMounted(() => {
      initMap();
    });

    return () => (
      <div class="relative w-full h-[80vh]">
        <div id="map" class="w-full h-full"></div>
        {props.showMousePosition && mousePosition.value && (
          <div class="absolute bottom-0 left-0 bg-white px-2 py-1 m-2 rounded shadow text-sm">
            {mousePosition.value}
          </div>
        )}
      </div>
    );
  },
});

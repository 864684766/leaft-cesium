import { defineComponent, onMounted, ref } from "vue";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-fullscreen/dist/leaflet.fullscreen.css";

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "leaflet-draw";
import "leaflet-fullscreen";

export default defineComponent({
  name: "MyComponent",
  props: {
    /**
     * 地图缩放等级
     */
    mapLevel: {
      type: Number,
      required: true,
      default: 13,
    },
    /**
     * 中心点
     */
    centerPoint: {
      type: Array,
      required: true,
      default: [30.355764, 120.024029],
    },
    /**
     * 是否启用聚合
     */
    enableClustering: {
      type: Boolean,
      default: true,
    },
    /**
     * 聚合半径
     */
    clusterRadius: {
      type: Number,
      default: 80,
    },
    /**
     * 是否显示鼠标位置坐标
     */
    showMousePosition: {
      type: Boolean,
      default: true,
    },
    /**
     * 底图类型
     */
    baseMapType: {
      type: String,
      default: "standard",
    },
    /**
     * 是否启用绘制工具
     */
    enableDraw: {
      type: Boolean,
      default: true,
    },
    /**
     * 是否启用测量工具
     */
    enableMeasure: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { expose, emit }) {
    const map = ref(null);
    const mousePosition = ref(null);
    const drawnItems = ref(null);
    const drawControl = ref(null);

    // 底图配置
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
     */
    const initDrawTools = () => {
      if (!props.enableDraw && !props.enableMeasure) return;

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
              }
            : false,
          polygon: props.enableMeasure
            ? {
                allowIntersection: false,
                showArea: true,
                showLength: true,
                metric: true,
                shapeOptions: {
                  color: "#f357a1",
                },
              }
            : false,
          circle: props.enableDraw,
          marker: props.enableDraw,
          circlemarker: false,
          rectangle: props.enableDraw,
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
        if (props.enableMeasure) {
          if (event.layerType === "polyline") {
            const distance = calculateDistance(layer);
            layer.bindPopup(`距离: ${distance.toFixed(2)} 米`);
          } else if (event.layerType === "polygon") {
            const area = calculateArea(layer);
            layer.bindPopup(`面积: ${area.toFixed(2)} 平方米`);
          }
        }
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
     * 计算面积
     */
    const calculateArea = (layer) => {
      const latlngs = layer.getLatLngs()[0];
      return L.GeometryUtil.geodesicArea(latlngs);
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

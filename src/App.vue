<script setup>
import Leaflet from "./components/Leaflet";
import DataIO from "./components/DataIO";
import { ref, shallowRef, defineAsyncComponent } from "vue";

// 使用异步组件懒加载Cesium组件，减少初始加载时间
const Cesium3D = defineAsyncComponent(() => import("./components/Cesium"));

const mapPoints = ref([]);
const leafletRef = ref(null);
const cesiumRef = shallowRef(null);

// 保持两个地图组件的状态
const leafletVisible = ref(true);
const cesiumVisible = ref(false);
const isTransitioning = ref(false);

const handleDataImported = (points) => {
  mapPoints.value = points;
  // 更新地图上的点位
  const map = leafletRef.value?.getMap();
  if (!map) return;

  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });
  points.forEach((point) => {
    L.marker([point.lat, point.lng])
      .bindPopup(JSON.stringify(point.properties))
      .addTo(map);
  });
};

const mapMode = ref("2D"); // 2D 或 3D
const centerPoint = [30.355764, 120.024029];

const switchMapMode = (mode) => {
  if (isTransitioning.value || mapMode.value === mode) return;

  isTransitioning.value = true;
  mapMode.value = mode;

  // 切换显示状态而不是完全销毁和重建组件
  if (mode === "2D") {
    cesiumVisible.value = false;
    leafletVisible.value = true;
  } else {
    leafletVisible.value = false;
    cesiumVisible.value = true;
  }

  // 短暂延迟后重置过渡状态
  setTimeout(() => {
    isTransitioning.value = false;
  }, 100);
};
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="flex space-x-4 mb-4">
      <button
        @click="switchMapMode('2D')"
        :class="[
          `px-4 py-2 rounded font-bold`,
          mapMode === '2D'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700',
        ]"
        :disabled="isTransitioning"
      >
        二维地图
      </button>
      <button
        @click="switchMapMode('3D')"
        :class="[
          `px-4 py-2 rounded font-bold`,
          mapMode === '3D'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700',
        ]"
        :disabled="isTransitioning"
      >
        三维地图
      </button>
      <div v-if="isTransitioning" class="flex items-center">
        <div
          class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"
        ></div>
        <span class="text-sm text-gray-600">切换中...</span>
      </div>
    </div>

    <div class="relative">
      <!-- 使用v-show而不是v-if来保持组件状态 -->
      <div v-show="leafletVisible">
        <Leaflet ref="leafletRef" :centerPoint="centerPoint" />
      </div>
      <div
        v-show="cesiumVisible"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%"
        class="h-screen"
      >
        <Cesium3D
          ref="cesiumRef"
          :centerPoint="centerPoint"
          :height="1000"
          :minHeight="100"
          :maxPitchAngle="85"
          :cameraMoveSpeed="0.1"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
}
</style>

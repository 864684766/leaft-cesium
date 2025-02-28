import { defineComponent, ref } from 'vue';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default defineComponent({
  name: 'DataIO',
  props: {
    onDataImported: {
      type: Function,
      required: true
    }
  },
  setup(props) {
    const fileInput = ref(null);

    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          await handleExcelFile(file);
        } else if (file.name.endsWith('.geojson')) {
          await handleGeoJSONFile(file);
        } else {
          alert('不支持的文件格式');
        }
      } catch (error) {
        console.error('文件处理错误:', error);
        alert('文件处理失败');
      }
    };

    const handleExcelFile = async (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 假设Excel文件包含lat和lng列
        const points = jsonData.map(row => ({
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          properties: { ...row }
        })).filter(point => !isNaN(point.lat) && !isNaN(point.lng));

        props.onDataImported(points);
      };
      reader.readAsArrayBuffer(file);
    };

    const handleGeoJSONFile = async (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const geojson = JSON.parse(e.target.result);
          if (geojson.type === 'FeatureCollection') {
            const points = geojson.features
              .filter(feature => feature.geometry.type === 'Point')
              .map(feature => ({
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],
                properties: feature.properties || {}
              }));
            props.onDataImported(points);
          }
        } catch (error) {
          console.error('GeoJSON解析错误:', error);
          alert('无效的GeoJSON文件');
        }
      };
      reader.readAsText(file);
    };

    const exportToExcel = (data) => {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Points');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'points.xlsx');
    };

    const exportToGeoJSON = (data) => {
      const geojson = {
        type: 'FeatureCollection',
        features: data.map(point => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.lng, point.lat]
          },
          properties: point.properties || {}
        }))
      };
      const blob = new Blob([JSON.stringify(geojson)], { type: 'application/json' });
      saveAs(blob, 'points.geojson');
    };

    return () => (
      <div class="flex space-x-4 p-4">
        <input
          type="file"
          ref={fileInput}
          accept=".xlsx,.xls,.geojson"
          onChange={handleFileUpload}
          class="hidden"
        />
        <button
          onClick={() => fileInput.value.click()}
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          导入数据
        </button>
        <button
          onClick={() => exportToExcel(props.data)}
          class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          导出Excel
        </button>
        <button
          onClick={() => exportToGeoJSON(props.data)}
          class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
        >
          导出GeoJSON
        </button>
      </div>
    );
  }
});
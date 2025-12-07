import ApiExecutor from '/assets/api_explorer/js/components/ApiExecutor.js';

const ApiCard = {
  props: ['api', 'settings', 'executingApi', 'selectedCodeType', 'generatedCode', 'isFavorite', 'isExpanded', 'apiParameters', 'apiFiles', 'apiResponses'],
  emits: ['toggle', 'toggleFavorite', 'addParam', 'addFile', 'clearAll', 'updateParam', 'updateFile', 'onFileSelect', 'removeParam', 'removeFile', 'executeApi', 'copyResponse', 'selectCodeType', 'copyCode', 'copyDocs'],
  components: { ApiExecutor },
  template: `
    <div class="api-card">
      <div class="api-header" @click="$emit('toggle', api)">
        <div class="api-content">
          <div class="api-text">
            <div class="api-method">{{ api.name || api.api_name }}</div>
            <div class="api-path">{{ api.display_path || api.path || api.api_path }}</div>
            <div v-if="api.scheduler" class="api-frequency">{{ api.frequency }}</div>
          </div>
        </div>
        <div class="api-actions">
          <button class="btn-icon" @click.stop="$emit('toggleFavorite', api)">
            <span class="star-icon" :class="{ empty: !isFavorite }">★</span>
          </button>
          <span class="dropdown-icon" :class="{ expanded: isExpanded }">▼</span>
        </div>
      </div>
      
      <div v-if="isExpanded" class="api-details">
        <ApiExecutor 
          v-if="!api.scheduler"
          :api="api"
          :apiPath="api.path || api.api_path"
          :settings="settings"
          :executingApi="executingApi"
          :selectedCodeType="selectedCodeType"
          :generatedCode="generatedCode"
          :apiParameters="apiParameters"
          :apiFiles="apiFiles"
          :apiResponses="apiResponses"
          @addParam="(path) => $emit('addParam', path)"
          @addFile="(path) => $emit('addFile', path)"
          @clearAll="(path) => $emit('clearAll', path)"
          @updateParam="(path, idx, field, val) => $emit('updateParam', path, idx, field, val)"
          @updateFile="(path, idx, field, val) => $emit('updateFile', path, idx, field, val)"
          @onFileSelect="(path, idx, evt) => $emit('onFileSelect', path, idx, evt)"
          @removeParam="(path, idx) => $emit('removeParam', path, idx)"
          @removeFile="(path, idx) => $emit('removeFile', path, idx)"
          @executeApi="(api) => $emit('executeApi', api)"
          @copyResponse="(api) => $emit('copyResponse', api)"
          @selectCodeType="(path, type) => $emit('selectCodeType', path, type)"
          @copyCode="(path) => $emit('copyCode', path)"
          @copyDocs="(path) => $emit('copyDocs', path)"
        />
        <div v-else-if="api.scheduler" class="scheduler-info">
          <div class="panel-header">
            <div class="panel-title">Scheduler Information</div>
          </div>
          <div class="scheduler-details">
            <div class="scheduler-item">
              <span class="scheduler-label">Frequency:</span>
              <span class="scheduler-value">{{ api.frequency }}</span>
            </div>
            <div class="scheduler-item">
              <span class="scheduler-label">Path:</span>
              <span class="scheduler-value">{{ api.path || api.api_path }}</span>
            </div>
            <div v-if="api.docstring" class="scheduler-item">
              <span class="scheduler-label">Description:</span>
              <span class="scheduler-value">{{ api.docstring }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

export default ApiCard;

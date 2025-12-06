const ApiExecutor = {
  props: ['api', 'apiPath', 'settings', 'executingApi', 'selectedCodeType', 'generatedCode', 'apiParameters', 'apiFiles', 'apiResponses'],
  emits: ['addParam', 'addFile', 'clearAll', 'updateParam', 'updateFile', 'onFileSelect', 'removeParam', 'removeFile', 'executeApi', 'copyResponse', 'selectCodeType', 'copyCode', 'copyDocs'],
  data() {
    return {
      showDocs: false,
      apiDocs: null,
      loadingDocs: false
    };
  },
  methods: {
    getApiParameters() {
      return this.apiParameters[this.apiPath] || [];
    },
    getApiFiles() {
      return this.apiFiles[this.apiPath] || [];
    },
    getApiResponse() {
      return this.apiResponses[this.apiPath];
    },
    
    async toggleDocs() {
      this.showDocs = !this.showDocs;
      if (this.showDocs && !this.apiDocs) {
        await this.loadApiDocs();
      }
    },
    
    async loadApiDocs() {
      this.loadingDocs = true;
      try {
        const response = await fetch('/api/method/api_explorer.core.openapi.manager.get_api_schema', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Frappe-CSRF-Token': this.getCSRFToken() || ''
          },
          body: `api_path=${encodeURIComponent(this.apiPath)}`
        });
        
        if (!response.ok) throw new Error('Failed to fetch API documentation');
        
        const data = await response.json();
        this.apiDocs = data.message || data;
      } catch (e) {
        console.error('Error fetching API docs:', e);
        this.apiDocs = { error: 'Failed to load documentation' };
      } finally {
        this.loadingDocs = false;
      }
    },
    
    getCSRFToken() {
      const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const windowToken = window.csrf_token;
      const frappeToken = window.frappe?.csrf_token;
      return metaToken || windowToken || frappeToken || '';
    }
  },
  template: `
    <div class="execute-panel">
      <div class="panel-header">
        <div class="panel-title">Execution Panel</div>
        <div class="panel-actions">
          <button class="btn-sm" @click="$emit('addParam', apiPath)">+ Parameter</button>
          <button class="btn-sm" @click="$emit('addFile', apiPath)">+ File</button>
          <button class="btn-sm" @click="$emit('clearAll', apiPath)">Clear</button>
        </div>
      </div>
      
      <div class="param-list">
        <div v-for="(param, index) in getApiParameters()" :key="'param-' + index" class="param-row">
          <input 
            type="text" 
            class="param-input param-key" 
            placeholder="Key"
            :value="param.key"
            @input="$emit('updateParam', apiPath, index, 'key', $event.target.value)"
          >
          <textarea 
            class="param-input param-value" 
            placeholder="Value"
            :value="param.value"
            @input="$emit('updateParam', apiPath, index, 'value', $event.target.value.trim())"
          ></textarea>
          <button class="param-remove" @click="$emit('removeParam', apiPath, index)">×</button>
        </div>
        
        <div v-for="(file, index) in getApiFiles()" :key="'file-' + index" class="file-row">
          <input 
            type="text" 
            class="param-input file-key" 
            placeholder="Key"
            :value="file.key"
            @input="$emit('updateFile', apiPath, index, 'key', $event.target.value)"
          >
          <div class="file-input-wrapper">
            <input 
              type="file" 
              class="file-input"
              @change="$emit('onFileSelect', apiPath, index, $event)"
            >
            <div class="file-button">
              <span class="file-icon">📄</span>
              <span>Choose</span>
            </div>
          </div>
          <div class="file-name" v-if="file.fileName">
            {{ file.fileName }}
          </div>
          <div class="file-name" v-else style="font-style: italic; color: #bbb;">
            No file selected
          </div>
          <select 
            class="param-select"
            :value="file.type"
            @change="$emit('updateFile', apiPath, index, 'type', $event.target.value)"
          >
            <option value="frappe_request">Frappe Request</option>
            <option value="base64">Base64</option>
            <option value="bytes">Bytes</option>
            <option value="raw_text">Raw Text</option>
          </select>
          <button class="param-remove" @click="$emit('removeFile', apiPath, index)">×</button>
        </div>
      </div>
      
      <div class="execute-actions">
        <button 
          class="execute-btn" 
          @click="$emit('executeApi', api)"
          :disabled="executingApi === apiPath || settings.disable_api_testing"
        >
          <span v-if="!executingApi || executingApi !== apiPath">▷</span>
          {{ executingApi === apiPath ? 'Executing...' : 'Execute' }}
        </button>
        
        <div class="code-buttons">
          <button class="code-tab" :class="{ active: selectedCodeType[apiPath] === 'curl' }" @click="$emit('selectCodeType', apiPath, 'curl')">cURL</button>
          <button class="code-tab" :class="{ active: selectedCodeType[apiPath] === 'bash' }" @click="$emit('selectCodeType', apiPath, 'bash')">Bash</button>
          <button class="code-tab" :class="{ active: selectedCodeType[apiPath] === 'python' }" @click="$emit('selectCodeType', apiPath, 'python')">Python</button>
          <button class="code-tab" :class="{ active: selectedCodeType[apiPath] === 'fetch' }" @click="$emit('selectCodeType', apiPath, 'fetch')">Fetch</button>
        </div>
        
        <button 
          class="docs-btn" 
          :class="{ active: showDocs }"
          @click="toggleDocs" 
          title="View API Documentation"
        >
          Docs
        </button>
      </div>
      
      <div v-if="getApiResponse()" class="response-section">
        <div class="response-header">
          <div class="panel-title">Response</div>
          <div class="response-actions">
            <button 
              class="copy-btn" 
              @click="$emit('copyResponse', api)"
              title="Copy Response"
            >
              Copy
            </button>
            <span class="response-status">
              {{ getApiResponse().status_code }} • {{ Math.round(getApiResponse().response_time) }}ms
            </span>
          </div>
        </div>
        <div class="response-body">{{ typeof getApiResponse().response === 'string' ? getApiResponse().response : JSON.stringify(getApiResponse().response, null, 2) }}</div>
      </div>
      
      <div v-if="generatedCode[apiPath] && selectedCodeType[apiPath]" class="response-section">
        <div class="response-header">
          <div class="panel-title">Generated Code ({{ selectedCodeType[apiPath] }})</div>
          <button class="copy-btn" @click="$emit('copyCode', apiPath)" title="Copy Code">Copy</button>
        </div>
        <div class="response-body">{{ generatedCode[apiPath] }}</div>
      </div>
      
      <div v-if="showDocs" class="response-section">
        <div class="response-header">
          <div class="panel-title">API Documentation</div>
          <button class="copy-btn" @click="$emit('copyDocs', apiPath)" title="Copy Documentation">Copy</button>
        </div>
        <div v-if="loadingDocs" class="response-body" style="text-align: center; padding: 20px;">
          Loading documentation...
        </div>
        <div v-else-if="apiDocs?.error" class="response-body" style="color: #e74c3c;">
          {{ apiDocs.error }}
        </div>
        <div v-else-if="apiDocs" class="response-body">
          {{ JSON.stringify(apiDocs, null, 2) }}
        </div>
      </div>
    </div>
  `
};

export default ApiExecutor;
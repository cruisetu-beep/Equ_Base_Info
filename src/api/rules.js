import axios from 'axios'

// 这里的 BASE_URL 可以根据具体环境配置，这里默认使用相对路径 /api/Equipment
const API_PREFIX = '/api/Equipment';

function mapBackendToFrontendRule(r) {
  if (!r) return null;
  return {
    ruleId: r.RuleID,
    catalogId: r.CatalogID,
    batch: r.Catalog || '',
    typeK: r.EquipTypeLevel1 || '',
    subType: r.EquipTypeLevel2 || '',
    product: r.ProductName || '',
    modelSeries: r.ModelSeries || '',
    modelListRaw: r.ModelListRaw || [],
    specConditionDesc: r.SpecConditionDesc || '',
    productionYearConstraint: r.ProductionYearConstraint || '',
    typeE: r.EliminationType || '',
    deadline: r.Deadline || '',
    enabled: r.State === 1,
    reason: r.EliminationReason || '',
    standard: r.NationalStandard || [],
    remark: r.Remark || '',
    confidence: r.Confidence || 'H',
    section: r.Section || '',
    sectionNum: r.SectionNum || 1,
    originalPage: r.OriginalPage || '',
    modelCount: r.ModelCount || 0,
    specCount: r.SpecCount || 0,
    modelPattern: (r.ModelPattern || []).map(m => ({
      modelId: m.ModelID,
      ruleId: m.RuleID,
      modelName: m.ModelName,
      isPrefixMatch: m.IsPrefixMatch,
      state: m.State
    })),
    specConstraints: (r.SpecConstraints || []).map(s => ({
      specId: s.SpecID,
      ruleId: s.RuleID,
      groupSeq: s.GroupSeq,
      field: s.ParamName,
      op: s.LogicOp,
      val1: s.LogicOp === '=' ? s.ValueExact : s.ValueLower,
      val2: s.ValueUpper,
      unit: s.ValueUnit,
      state: s.State
    }))
  };
}

function mapFrontendToBackendRule(r) {
  if (!r) return null;
  return {
    RuleID: r.ruleId,
    CatalogID: r.catalogId || 0,
    Catalog: r.batch || '',
    EquipTypeLevel1: r.typeK || '',
    EquipTypeLevel2: r.subType || '',
    ProductName: r.product || '',
    ModelSeries: r.modelSeries || '',
    ModelListRaw: r.modelListRaw || [],
    SpecConditionDesc: r.specConditionDesc || '',
    ProductionYearConstraint: r.productionYearConstraint || '',
    EliminationType: r.typeE || '',
    Deadline: r.deadline || null,
    State: r.enabled ? 1 : 0,
    EliminationReason: r.reason || '',
    NationalStandard: r.standard || [],
    Remark: r.remark || '',
    Confidence: r.confidence || 'H',
    Section: r.section || '',
    SectionNum: r.sectionNum || 1,
    OriginalPage: r.originalPage || '',
    ModelPattern: (r.modelPattern || []).map(m => ({
      ModelID: m.modelId || 0,
      RuleID: m.ruleId || r.ruleId,
      ModelName: m.modelName,
      IsPrefixMatch: m.isPrefixMatch || false,
      State: m.state || 1
    })),
    SpecConstraints: (r.specConstraints || []).map(s => ({
      SpecID: s.specId || 0,
      RuleID: s.ruleId || r.ruleId,
      GroupSeq: s.groupSeq || 1,
      ParamName: s.field,
      LogicOp: s.op,
      ValueExact: s.op === '=' ? s.val1 : null,
      ValueLower: s.op === 'range' ? s.val1 : null,
      ValueUpper: s.op === 'range' ? s.val2 : null,
      ValueUnit: s.unit,
      State: s.state || 1
    }))
  };
}

export async function getRuleStats() {
  const res = await axios.get(`${API_PREFIX}/getRuleStats`);
  return res.data.data; 
}

export async function getRuleList(queryInput) {
  const res = await axios.get(`${API_PREFIX}/getRuleList`, { params: queryInput });
  if (res.data.data && res.data.data.table) {
    res.data.data.table = res.data.data.table.map(mapBackendToFrontendRule);
  }
  return res.data.data;
}

export async function getRuleDetail(ruleId) {
  const res = await axios.get(`${API_PREFIX}/getRuleDetail`, { params: { ruleId } });
  return mapBackendToFrontendRule(res.data.data);
}

export async function createRule(rule) {
  const backendRule = mapFrontendToBackendRule(rule);
  const res = await axios.post(`${API_PREFIX}/createRule`, backendRule);
  return res.data.data;
}

export async function updateRule(rule) {
  const backendRule = mapFrontendToBackendRule(rule);
  const res = await axios.post(`${API_PREFIX}/updateRule`, backendRule);
  return res.data.data;
}

export async function toggleRuleStatus(ruleId) {
  const res = await axios.post(`${API_PREFIX}/toggleRuleStatus?ruleId=${ruleId}`);
  return res.data.data;
}

export async function deleteRule(ruleId) {
  const res = await axios.post(`${API_PREFIX}/deleteRule?ruleId=${ruleId}`);
  return res.data.data;
}

export async function getAttributeNames() {
  const res = await axios.get(`${API_PREFIX}/getAttributeNames`);
  return res.data.data;
}

export async function getLogicOperations() {
  const res = await axios.get(`${API_PREFIX}/getLogicOperations`);
  return res.data.data;
}

export async function getConfidenceOptions() {
  const res = await axios.get(`${API_PREFIX}/getConfidenceOptions`);
  return res.data.data;
}

export async function getEliminationTypes() {
  const res = await axios.get(`${API_PREFIX}/getEliminationTypes`);
  return res.data.data;
}

export async function getAllRuleIds() {
  const res = await axios.get(`${API_PREFIX}/getAllRuleIds`);
  return res.data.data;
}

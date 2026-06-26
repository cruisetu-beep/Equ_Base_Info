import axios from 'axios'
import { USE_MOCK } from './config'
import { SAMPLE_DEVICES } from '@/data/devices'

const API_PREFIX = '/api/Equipment'

// 当 Mock 开关为 true 时，使用这批静态设备作为数据库状态的模拟
let mockDevices = SAMPLE_DEVICES.map(d => {
  const isJudged = d.status !== 'pending';
  return {
    equId: d.id,
    buildId: 'BUILD-0001',
    equipmentName: d.name,
    equipmentTypeId: d.typeK,
    typeName: d.type2,
    model: d.model,
    brand: d.paramGroups?.[0]?.items?.find(i => i.name === '品牌')?.value || '未知',
    year: String(d.year),
    power: d.paramGroups?.[0]?.items?.find(i => i.name === '额定功率')?.value || '—',
    manufactureDate: `${d.year}-06-01`,
    judgeStatus: isJudged ? '已判定' : '未判定',
    basisId: isJudged ? Math.floor(Math.random() * 1000) : null,
    ruleId: d.ruleHit || null,
    eliminationType: d.level || '',
    matchMethod: '规则引擎自动判定',
    judgmentCriteria: d.reason || '',
    judgmentDate: isJudged ? d.updated : null,
    desc: d.reason || ''
  };
});

export async function getJudgeEquipmentList(query) {
  if (USE_MOCK) {
    const qObj = query || {};
    const pageIndex = qObj.PageIndex || qObj.pageIndex || 1;
    const pageSize = qObj.PageSize || qObj.pageSize || 10;
    const filterYear = qObj.FilterYear || qObj.filterYear;
    const filterBrand = qObj.FilterBrand || qObj.filterBrand;
    const filterModel = qObj.FilterModel || qObj.filterModel;
    const judgeStatus = qObj.JudgeStatus || qObj.judgeStatus;
    const q = qObj.Q || qObj.q;

    let filtered = [...mockDevices];
    if (filterYear && filterYear !== 'all') filtered = filtered.filter(d => d.year === filterYear);
    if (filterBrand && filterBrand !== 'all') filtered = filtered.filter(d => d.brand === filterBrand);
    if (filterModel) filtered = filtered.filter(d => d.model?.includes(filterModel));
    if (judgeStatus && judgeStatus !== 'all') filtered = filtered.filter(d => d.judgeStatus === judgeStatus);
    if (q) {
      const keyword = q.toLowerCase();
      filtered = filtered.filter(d => d.equipmentName?.toLowerCase().includes(keyword) || d.equId?.toLowerCase().includes(keyword));
    }
    const totalCount = filtered.length;
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize;
    const rows = filtered.slice(start, end);
    return {
      table: rows,
      rowCount: totalCount,
      total: totalCount,
      pageSize,
      pageIndex
    };
  }

  const res = await axios.get(`${API_PREFIX}/getJudgeEquipmentList`, { params: query });
  return res.data.data;
}

export async function getDistinctFilterYears(buildId) {
  if (USE_MOCK) {
    return Array.from(new Set(mockDevices.map(d => d.year))).sort();
  }
  const res = await axios.get(`${API_PREFIX}/getDistinctFilterYears`, { params: { buildId } });
  return res.data.data;
}

export async function getDistinctFilterBrands(buildId) {
  if (USE_MOCK) {
    return Array.from(new Set(mockDevices.map(d => d.brand))).sort();
  }
  const res = await axios.get(`${API_PREFIX}/getDistinctFilterBrands`, { params: { buildId } });
  return res.data.data;
}

/**
 * 批量执行淘汰设备判定
 * @param {Array<string>} equIds 设备ID列表
 */
export async function judgeEquipments(equIds) {
  if (USE_MOCK) {
    const results = equIds.map(id => {
      const d = mockDevices.find(x => x.equId === id) || {
        equId: id,
        equipmentName: '测试设备',
        model: 'Y-100',
        year: '2010',
        power: '5.5 kW',
        manufactureDate: '2010-01-01',
        typeName: '通用设备'
      };

      const yearNum = parseInt(d.year);
      const isLowEff = yearNum <= 2012;
      const status = isLowEff ? (yearNum <= 2008 ? '强制淘汰' : '限期淘汰') : '正常';

      const hits = [];
      if (isLowEff) {
        hits.push({
          ruleId: 'MOCK-RULE-01',
          ruleName: d.typeName || '三级能效淘汰限制',
          eliminationType: status,
          matchMethod: '型号前缀+投运年份约束判定',
          judgmentCriteria: `【型号匹配】：命中 ${d.model} 系列，【年份匹配】：投运年份 ${d.year} 小于等于 2012 年`,
          desc: '依据标准：GB18613-2012 能效限定标准。'
        });
      }

      return {
        equId: d.equId,
        equipmentName: d.equipmentName,
        model: d.model,
        year: d.year,
        power: d.power,
        manufactureDate: d.manufactureDate,
        judgeStatus: status,
        hits
      };
    });

    return results;
  }

  const res = await axios.post(`${API_PREFIX}/judgeEquipments`, { equIds });
  return res.data.data;
}

/**
 * 保存/确认淘汰判定结果
 * @param {Array<Object>} items 保存明细列表
 */
export async function saveJudgeResults(items) {
  if (USE_MOCK) {
    items.forEach(item => {
      const dev = mockDevices.find(x => x.equId === item.equId);
      if (dev) {
        dev.judgeStatus = '已判定';
        dev.ruleId = item.ruleId;
        dev.eliminationType = item.eliminationType;
        dev.matchMethod = item.matchMethod;
        dev.judgmentCriteria = item.judgmentCriteria;
        dev.desc = item.desc;
        dev.judgmentDate = new Date().toISOString().replace('T', ' ').slice(0, 19);
      }
    });
    return true;
  }

  const backendItems = items.map(d => ({
    EquId: d.equId,
    BuildId: d.buildId,
    RuleId: d.ruleId,
    EliminationType: d.eliminationType,
    MatchMethod: d.matchMethod,
    JudgmentCriteria: d.judgmentCriteria,
    Desc: d.desc
  }));

  const res = await axios.post(`${API_PREFIX}/saveJudgeResults`, { items: backendItems });
  return res.data.data;
}

export async function getObsoleteBatches() {
  if (USE_MOCK) {
    return ['第一批', '第二批', '第三批', '第四批'];
  }
  const res = await axios.get(`${API_PREFIX}/getObsoleteBatches`);
  return res.data.data;
}

export async function getEliminationTypesFromDb() {
  if (USE_MOCK) {
    return ['强制淘汰', '限期淘汰'];
  }
  const res = await axios.get(`${API_PREFIX}/getEliminationTypesFromDb`);
  return res.data.data;
}

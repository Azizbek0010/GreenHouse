const { getStockMap } = require('../utils/stock')

// GET /api/stock — ombor qoldig'i (type+razmer kesimida)
// kassa: faqat o'z qoldig'i. admin: ?kassa=<id> yoki hammasi jami.
exports.getStock = async (req, res, next) => {
  try {
    const kassaId = req.user.role === 'kassa'
      ? req.user.id
      : (req.query.kassa || null)

    const map = await getStockMap(kassaId)

    const rows = [...map.values()].sort((a, b) =>
      a.type.localeCompare(b.type) || a.razmer - b.razmer
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

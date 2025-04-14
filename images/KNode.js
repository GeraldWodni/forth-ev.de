const fs = require('fs');
const path = require('path');

/**
 * 递归读取指定目录下的所有文件和文件夹
 * @param {string} dir 要查看的目录路径
 */
function readDirectory(dir) {
  try {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        console.log('📁 目录:', fullPath);
        readDirectory(fullPath); // 递归读取子目录
      } else {
        console.log('📄 文件:', fullPath);
      }
    });
  } catch (err) {
    console.error('❌ 读取目录失败:', err.message);
  }
}

// 示例：读取当前项目根目录
readDirectory('./');
// CleanSheet Phase 2 冒烟测试：server/utils/password.ts（PBKDF2 纯 WebCrypto）
// node >= 20 可直接 import TS（类型剥离）；不依赖 h3 / KV，可本地运行。
import assert from 'node:assert';

const { hashPassword, verifyPassword } = await import('../server/utils/password.ts');

let pass = 0;
const ok = (name, cond) => {
  assert(cond, `FAIL: ${name}`);
  pass++;
  console.log(`  ok - ${name}`);
};

console.log('== 密码哈希 ==');
const h1 = await hashPassword('correct-horse-123');
ok('哈希串格式 pbkdf2$100000$...', /^pbkdf2\$100000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/.test(h1));
ok('正确密码校验通过', await verifyPassword('correct-horse-123', h1));
ok('错误密码校验失败', !(await verifyPassword('wrong-password', h1)));
ok('空密码校验失败', !(await verifyPassword('', h1)));

const h2 = await hashPassword('correct-horse-123');
ok('同一密码两次哈希盐不同（h1 != h2）', h1 !== h2);
ok('不同盐的哈希都能校验通过', await verifyPassword('correct-horse-123', h2));

console.log('== 异常输入 ==');
ok('非法存储串返回 false', !(await verifyPassword('x', 'not-a-hash')));
ok('截断存储串返回 false', !(await verifyPassword('x', 'pbkdf2$100000$abc')));
ok('算法名被篡改返回 false', !(await verifyPassword('correct-horse-123', h1.replace('pbkdf2', 'md5'))));

console.log('== 中文密码 ==');
const hc = await hashPassword('密码强度测试123');
ok('中文密码哈希 + 校验通过', await verifyPassword('密码强度测试123', hc));
ok('中文密码错误校验失败', !(await verifyPassword('密码强度测试124', hc)));

console.log(`\n全部通过：${pass} 项`);

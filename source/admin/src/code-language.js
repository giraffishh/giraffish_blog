const aliases = {
  py:'python', python3:'python', pythno:'python', 'c++':'cpp', cc:'cpp', cxx:'cpp',
  js:'javascript', jsx:'javascript', ts:'typescript', tsx:'typescript',
  sh:'bash', shell:'bash', zsh:'bash', console:'bash', ps1:'powershell', ps:'powershell',
  cmd:'dos', bat:'dos', batch:'dos', postgres:'sql', postgresql:'sql', pgsql:'sql',
  mysql:'sql', sqlite:'sql', yml:'yaml', htm:'xml', html:'xml', docker:'dockerfile',
  plain:'plaintext', text:'plaintext', txt:'plaintext'
};
export function codeLanguage(info = '') {
  const name = info.trim().split(/\s+/,1)[0].toLowerCase();
  return aliases[name] || name;
}

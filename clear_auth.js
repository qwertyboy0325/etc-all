
// 在瀏覽器控制台執行這個腳本來清除舊的權限信息
localStorage.removeItem('token');
localStorage.removeItem('user'); 
localStorage.removeItem('apiConfig');
console.log('✅ 已清除舊的認證信息，請重新登入以獲取新權限');
window.location.reload();


/**
 * data.js
 * Static data: chapter texts, story list, state variables
 */

// ===== DATA =====
const CH_TEXTS = [
`Bầu trời phía đông ửng hồng, ánh bình minh chiếu rọi lên mặt hồ phẳng lặng như gương. Thiếu Trần ngồi khoanh tròn trên tảng đá lớn, đôi mắt nhắm hờ, đang cảm nhận từng luồng linh khí tinh tế đang thẩm thấu vào cơ thể.

Đã ba năm kể từ ngày hắn đến thế giới này. Ba năm — dài bằng cả một đời người thường, ngắn như cái chớp mắt với người tu tiên. Nhưng với Thiếu Trần, ba năm đó là cả một cuộc hành trình lột xác hoàn toàn.

Hắn nhớ ngày đầu tiên mở mắt trong thân xác này. Cơ thể yếu đuối của một thiếu niên mười lăm tuổi, linh căn tệ nhất trong số các đệ tử của Thanh Vân Môn. Nhưng trong đầu hắn lại chứa đựng toàn bộ ký ức của Thiếu Trần — Đan Tôn tối cao của thế giới tu chân, người đứng ở đỉnh cao nhất của luyện đan đạo suốt ba trăm năm.

Tiếng gọi lanh lảnh cắt đứt dòng suy nghĩ của hắn. Một thiếu nữ mặc áo xanh đang chạy lại từ phía xa, mái tóc đen dài tung bay trong gió sớm. Đó là Vân Lộ — sư tỷ thân thiết nhất kể từ khi hắn vào môn phái.`,

`"Sư tỷ." Thiếu Trần gật đầu, thu hồi linh khí, đứng dậy phủi bụi trên quần áo.

Vân Lộ nhảy lên tảng đá ngồi cạnh hắn, đôi mắt sáng long lanh nhìn hắn từ trên xuống dưới như muốn tìm kiếm điều gì đó.

"Nghe nói ngày mai có buổi kiểm tra đột xuất. Sư phụ muốn xem tiến độ tu luyện của chúng ta trong ba tháng vừa qua." Cô nhíu mày, vẻ lo lắng. "Sư đệ có chuẩn bị gì chưa? Mấy sư huynh kia đã đạt đến Luyện Khí tầng ba rồi đó."

Thiếu Trần im lặng một lúc. Luyện Khí tầng ba — đối với những người khác, đó là thành tựu đáng tự hào sau ba năm. Nhưng với hắn, thứ đó không phải là mục tiêu.

"Không sao," hắn nói, giọng bình thản. "Kiểm tra gì cũng được."

Vân Lộ trợn mắt. "Sư đệ! Em vẫn còn ở Luyện Khí tầng một! Sư phụ sẽ thất vọng lắm đó!" Thiếu Trần chỉ mỉm cười nhẹ. Trong lòng hắn, bức tranh về tương lai đã vô cùng rõ ràng.`,

`Trong gian phòng nhỏ của mình, Thiếu Trần nhẹ nhàng mở chiếc hộp gỗ mộc mạc đặt trên bàn. Bên trong là hai viên đan dược toát ra mùi thơm dịu nhẹ — thứ mà hắn đã cất công luyện chế trong suốt một tháng qua.

Tam Nguyên Đan — một loại đan dược hạng trung có thể tăng tốc tu luyện gấp ba lần trong vòng một tháng. Công thức này đã thất truyền từ ba trăm năm trước, và hắn là người duy nhất còn nhớ nó.

Hắn nhấc một viên đan lên, ngắm ánh đèn chiếu qua lớp vỏ đan màu hổ phách. Chất lượng viên đan này vượt xa tiêu chuẩn hạng trung — thậm chí có thể sánh với đan dược hạng thượng của những Đan Sư hàng đầu môn phái.

Nhưng Thiếu Trần không có ý định để ai biết điều đó. Chưa đến lúc. Hắn khép hộp lại, nhìn ra cửa sổ. Bầu trời đêm đầy sao đang chờ đợi hắn — không phải để hắn trốn chạy, mà để hắn chinh phục.`
];



const CH_NAMES = ["Khởi Đầu","Bí Mật","Đột Phá","Giác Ngộ","Kẻ Thù","Cơ Duyên","Chiến Đấu","Lột Xác","Cột Mốc","Hội Ngộ","Thách Thức","Giải Thoát"];

let STORIES = []; // Đổi từ const thành let để có thể gán dữ liệu từ API vào
// ===== STATE =====
let curStory = null, curCh = 0;
let curUser = JSON.parse(localStorage.getItem('user_info')) || null;

// ===== HELPERS =====
function getStoryId(story) {
  return story.id || story.storyId || 0;
}

function normalizeUserState(user) {
  if (!user) return null;
  return {
    ...user,
    firstname: user.fullName || user.username || 'Người dùng',
    library: user.library || [],
    readData: user.readData || {},
    history: user.history || [],
    followed: user.followed || []
  };
}

function formatView(num) {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

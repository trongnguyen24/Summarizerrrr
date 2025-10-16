## Tư vấn UX: Tags vs Folders cho Summarizerrrr

### **Kết luận: GIỮ TAGS - Cải thiện thay vì thay thế**

Sau khi phân tích kỹ lưỡng cấu trúc hiện tại và use case của Summarizerrrr, tôi khuyến nghị **giữ hệ thống tags** nhưng cải thiện trải nghiệm người dùng.

### **Tại sao Tags tốt hơn cho use case này:**

1. **Phù hợp với nội dung đa dạng**: Video YouTube, courses, research papers thường thuộc nhiều categories
2. **Flexibility**: Một summary có thể có nhiều tags (machine-learning + tutorial + python)
3. **Search behavior**: Người dùng tìm theo chủ đề thay vì cấu trúc thư mục
4. **Scalability**: Dễ mở rộng khi content library tăng trưởng

### **Vấn đề hiện tại cần cải thiện:**

1. **Single-tag filter limitation** - Chỉ lọc theo 1 tag
2. **Thiếu tag management tools** - Không có merge, analytics
3. **UX discovery** - Khó tìm thấy tags phù hợp

### **Kế hoạch cải thiện theo 优先级:**

**Phase 1 (P0): Multi-tag Filter**

- Cập nhật archiveFilterStore hỗ trợ multiple tags
- Thêm AND/OR logic cho filter combinations
- UI cho multi-select tags

**Phase 2 (P1): Smart Tag Management**

- Tag usage analytics
- Tag merge functionality
- Bulk tag operations

**Phase 3 (P2): Enhanced Discovery**

- Auto-tag suggestions
- Tag cloud visualization
- Filter presets

### **Không chuyển sang Folders vì:**

- Rigid structure không phù hợp với content đa chiều
- Forced single categorization gây friction
- Khó maintain khi scale
- Không match với user search behavior

Tags với improvements sẽ cung cấp flexibility cần thiết cho summarization tool trong khi vẫn maintain intuitive user experience.

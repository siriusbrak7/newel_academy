import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (title: string, data: any[], columns: string[]): void => {
  try {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Table
    autoTable(doc, {
      head: [columns],
      body: data.map(row => columns.map(col => row[col] || '')),
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [6, 182, 212] } // Cyan color
    });
    
    doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to generate PDF');
  }
};

export const exportToCSV = (data: any[], filename: string): void => {
  try {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle strings with commas/quotes
          if (typeof value === 'string') {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export error:', error);
    alert('Failed to generate CSV');
  }
};

// Helper for teacher dashboard
export const exportStudentReport = (students: any[]): void => {
  const columns = ['username', 'gradeLevel', 'avgScore', 'lastActive', 'streak'];
  const formattedData = students.map(student => ({
    username: student.username,
    gradeLevel: student.gradeLevel || 'N/A',
    avgScore: `${Math.round(student.avgScore || 0)}%`,
    lastActive: student.lastActive,
    streak: `${student.streak} days`
  }));
  
  exportToPDF('Student Performance Report', formattedData, columns);
};
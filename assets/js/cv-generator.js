(function () {
  'use strict';

  var pdfmakeReady = false;
  var cvModalInstance = null;

  function loadScript(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = onload;
    document.head.appendChild(s);
  }

  function ensurePdfMake(callback) {
    if (pdfmakeReady) {
      callback();
      return;
    }

    loadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js',
      function () {
        loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js',
          function () {
            pdfmakeReady = true;
            callback();
          }
        );
      }
    );
  }

  function txt(el) {
    return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
  }

  function textAfterStrong(p) {
    if (!p) {
      return '';
    }

    var clone = p.cloneNode(true);
    clone.querySelectorAll('strong').forEach(function (strong) {
      strong.remove();
    });

    return txt(clone).replace(/^:\s*/, '');
  }

  function getFullProfileText() {
    var typed = document.querySelector('#hero .typed');
    if (typed) {
      var data = (typed.getAttribute('data-typed-items') || '').trim();
      if (data) {
        return data.replace(/\s+/g, ' ').replace(/^a\s+/i, '');
      }
    }

    var heroText = txt(document.querySelector('#hero p'));
    return heroText.replace(/^I'?m\s+/i, '');
  }

  function extractLinks(el) {
    if (!el) {
      return [];
    }

    return Array.from(el.querySelectorAll('a')).map(function (a) {
      var href = (a.getAttribute('href') || '').trim();
      var label = txt(a);
      return {
        href: href,
        label: label
      };
    });
  }

  function formatSkillGroup(skill) {
    var clean = (skill || '').trim();
    var label = clean;
    var items = '';

    if (!clean) {
      return null;
    }

    if (clean.indexOf(':') !== -1) {
      var colonIndex = clean.indexOf(':');
      label = clean.slice(0, colonIndex).trim();
      items = clean.slice(colonIndex + 1).trim();
    } else {
      var match = clean.match(/^(.+?)\s*\((.+)\)\s*$/);
      if (match) {
        label = match[1].trim();
        items = match[2].trim();
      }
    }

    if (!items) {
      if (/deep and machine learning/i.test(clean)) {
        label = 'Machine Learning & AI';
        items = 'Python | NumPy | pandas | Matplotlib | scikit-learn | TensorFlow';
      } else if (/natural language processing/i.test(clean) || /\bbert\b/i.test(clean) || /\bgpt\b/i.test(clean)) {
        label = 'NLP & Language Models';
        items = 'NLP | Database Federations | GPT | S-BERT | BERT';
      } else if (/frontend/i.test(clean) || /html/i.test(clean) || /css/i.test(clean) || /javascript/i.test(clean)) {
        label = 'Frontend & APIs';
        items = "API Infrastructure | HTML | CSS | JavaScript";
      } else if (/rdbms/i.test(clean) || /nosql/i.test(clean) || /graph database/i.test(clean) || /vector/i.test(clean)) {
        label = 'DBMS';
        items = 'RDBMS (Oracle Database, PostgreSQL) | NoSQL (MongoDB) | Graph Database (Neo4j) | Vector Databases (PGVector, Qdrant, Chroma)';
      }
    }

    items = items
      .replace(/\)\s*,\s*/g, ') | ')
      .replace(/\s*,\s*/g, ' | ')
      .replace(/\s+and\s+/gi, ' | ')
      .replace(/\s*\|\s*/g, '  ·  ')
      .trim();

    return {
      label: label,
      items: items
    };
  }

  var BLUE = '#0077b5';
  var DARK = '#0a1628';
  var INK = '#1a1a1a';
  var MUTED = '#555555';
  var DIM = '#777777';
  var DATE_COL_W = 148;

  function thinRule(topMargin) {
    return {
      canvas: [{
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 0.5,
        lineColor: '#bfd8ef'
      }],
      margin: [0, topMargin || 0, 0, 6]
    };
  }

  function sectionHeader(title) {
    return [
      {
        text: title.toUpperCase(),
        fontSize: 11,
        bold: true,
        color: BLUE,
        characterSpacing: 1.2,
        margin: [0, 8, 0, 2]
      },
      thinRule()
    ];
  }

  function makeEntry(titleText, periodText, orgs, bullets, tags) {
    var stack = [];

    if (periodText) {
      stack.push({
        columns: [
          { text: titleText || '', bold: true, fontSize: 10.5, color: INK, width: '*' },
          { text: periodText, fontSize: 9, color: DIM, width: DATE_COL_W, alignment: 'right', margin: [0, 1, 0, 0] }
        ],
        margin: [0, 0, 0, 1]
      });
    } else {
      stack.push({
        text: titleText || '',
        bold: true,
        fontSize: 10.5,
        color: INK,
        margin: [0, 0, 0, 1]
      });
    }

    (orgs || []).forEach(function (org) {
      if (org && org.trim()) {
        stack.push({
          text: org.trim(),
          fontSize: 9.5,
          color: MUTED,
          margin: [0, 0, 0, 1]
        });
      }
    });

    if (tags && tags.length) {
      stack.push({
        text: tags.join(' | '),
        fontSize: 9,
        color: BLUE,
        margin: [0, 1, 0, 2]
      });
    }

    if (bullets && bullets.length) {
      stack.push({
        ul: bullets.map(function (b) {
          return { text: b, fontSize: 10, color: INK };
        }),
        margin: [0, 2, 0, 0]
      });
    }

    return { stack: stack, unbreakable: true, margin: [0, 0, 0, 5] };
  }

  var builders = {
    profile: function () {
      var heroText = getFullProfileText();
      var content = sectionHeader('Profile');
      if (heroText) {
        content.push({
          text: heroText,
          fontSize: 10,
          margin: [0, 0, 0, 3],
          alignment: 'justify'
        });
      }
      return content;
    },

    skills: function () {
      var content = sectionHeader('Professional Skills');
      var skills = Array.from(document.querySelectorAll('#skills .skill')).map(txt).filter(Boolean);

      skills.forEach(function (skill) {
        var group = formatSkillGroup(skill);
        if (!group) {
          return;
        }

        content.push({
          text: [
            { text: group.label + '  ', bold: true, fontSize: 10.5, color: INK },
            { text: group.items, fontSize: 10, color: INK }
          ],
          margin: [0, 0, 0, 4]
        });
      });

      return content;
    },

    projects: function () {
      var content = sectionHeader('Selected Projects');
      var items = document.querySelectorAll('#projects .resume-item');

      items.forEach(function (item) {
        var title = txt(item.querySelector('h4'));
        var period = txt(item.querySelector('h5'));
        var paragraphs = Array.from(item.querySelectorAll('p')).map(txt).filter(Boolean);
        var bullets = Array.from(item.querySelectorAll('ul > li')).map(txt).filter(Boolean);

        if (!title) {
          return;
        }

        content.push(makeEntry(title, period, [], paragraphs.concat(bullets)));
      });

      return content;
    },

    research: function () {
      var content = sectionHeader('Current Research');
      var items = document.querySelectorAll('#funding .resume-item');

      items.forEach(function (item) {
        var title = txt(item.querySelector('h4'));
        var period = txt(item.querySelector('h5'));
        var paragraphs = Array.from(item.querySelectorAll('p')).map(txt).filter(Boolean);
        var bullets = Array.from(item.querySelectorAll('ul > li')).map(txt).filter(Boolean);

        if (!title) {
          return;
        }

        content.push(makeEntry(title, period, [], paragraphs.concat(bullets)));
      });

      return content;
    },

    publications: function () {
      var content = sectionHeader('Publications');
      var items = Array.from(document.querySelectorAll('#research .row p')).map(txt).filter(Boolean);

      if (items.length) {
        content.push({
          ul: items.map(function (item) {
            return { text: item, fontSize: 10, color: INK };
          })
        });
      }

      return content;
    },

    teaching: function () {
      var content = sectionHeader('Teaching');
      var items = Array.from(document.querySelectorAll('#teaching .row p'));

      items.forEach(function (item) {
        var strong = item.querySelector('strong');
        var period = txt(strong).replace(/:$/, '');
        var details = textAfterStrong(item);
        if (!details) {
          details = txt(item);
        }

        content.push(makeEntry(details, period, []));
      });

      return content;
    }
  };

  function squareBase64(imgEl) {
    var sw = imgEl.naturalWidth;
    var sh = imgEl.naturalHeight;

    if (sw === sh) {
      var exactCanvas = document.createElement('canvas');
      exactCanvas.width = sw;
      exactCanvas.height = sh;
      exactCanvas.getContext('2d').drawImage(imgEl, 0, 0, sw, sh);
      return exactCanvas.toDataURL('image/png');
    }

    var side = Math.min(sw, sh);
    var sx = Math.round((sw - side) / 2);
    var sy = Math.round((sh - side) / 2);
    var canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    canvas.getContext('2d').drawImage(imgEl, sx, sy, side, side, 0, 0, side, side);
    return canvas.toDataURL('image/png');
  }

  function imgToBase64(src, callback) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        callback(squareBase64(img));
      } catch (e) {
        callback(null);
      }
    };
    img.onerror = function () {
      callback(null);
    };
    img.src = src + '?nocache=' + Date.now();
  }

  function buildDocDef(selected, photoBase64) {
    var PHOTO_W = 52;
    var PHOTO_COL_W = 56;
    var titleSize = photoBase64 ? 10 : 11;
    var contactSize = photoBase64 ? 8 : 9;

    var textStack = [
      { text: 'Enas Khwaileh', fontSize: 22, bold: true, color: DARK, margin: [0, 0, 0, 2] },
      {
        text: 'Ph.D. Candidate in Data Intensive Systems at Utrecht University',
        fontSize: titleSize,
        color: BLUE,
        lineHeight: 1,
        margin: [0, 0, 0, 3]
      },
      {
        text: 'e.t.k.khwaileh@uu.nl  |  linkedin.com/in/enaskhwaileh  |  www.enaskhwaileh.com',
        fontSize: contactSize,
        color: '#555',
        lineHeight: 1,
        margin: [0, 0, 0, 0]
      }
    ];

    var headerBlock;
    if (photoBase64) {
      headerBlock = {
        columns: [
          { stack: textStack, width: '*' },
          { width: PHOTO_COL_W, alignment: 'right', stack: [{ image: photoBase64, width: PHOTO_W, height: PHOTO_W }] }
        ],
        margin: [0, 0, 0, 5]
      };
    } else {
      headerBlock = { stack: textStack, margin: [0, 0, 0, 5] };
    }

    var content = [
      headerBlock,
      {
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1.5,
          lineColor: BLUE
        }],
        margin: [0, 0, 0, 3]
      }
    ];

    selected.forEach(function (key) {
      if (builders[key]) {
        builders[key]().forEach(function (item) {
          content.push(item);
        });
      }
    });

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 35],
      content: content,
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2, color: INK },
      footer: function (currentPage, pageCount) {
        return {
          text: 'Generated from wwww.enaskhwaileh.com  |  Page ' + currentPage + ' of ' + pageCount,
          fontSize: 7.5,
          color: '#bbb',
          alignment: 'center',
          margin: [40, 6, 40, 0]
        };
      }
    };
  }

  window.generateCV = function () {
    var checked = document.querySelectorAll('#cv-modal input[type=checkbox]:checked');
    var selected = Array.from(checked)
      .map(function (cb) { return cb.value; })
      .filter(function (v) { return v !== 'photo'; });

    if (!selected.length) {
      window.alert('Please select at least one section.');
      return;
    }

    var includePhoto = document.getElementById('cv-include-photo').checked;
    var btn = document.getElementById('cv-generate-btn');
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generating...';

    function doGenerate(photoBase64) {
      ensurePdfMake(function () {
        try {
          pdfMake.createPdf(buildDocDef(selected, photoBase64)).download('Enas_Khwaileh_CV.pdf');
          if (cvModalInstance) {
            cvModalInstance.hide();
          }
        } catch (err) {
          console.error('CV generation failed:', err);
          window.alert('PDF generation failed. Please try again.');
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }

    if (includePhoto) {
      imgToBase64('assets/img/personal.jpeg', function (b64) {
        doGenerate(b64);
      });
    } else {
      doGenerate(null);
    }
  };

  window.openCVModal = function () {
    ensurePdfMake(function () { });

    var modalEl = document.getElementById('cv-modal');
    if (!modalEl || typeof bootstrap === 'undefined' || !bootstrap.Modal) {
      return;
    }

    cvModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    cvModalInstance.show();
  };

  document.addEventListener('DOMContentLoaded', function () {
    var trigger = document.getElementById('open-cv-generator');
    if (trigger) {
      trigger.addEventListener('click', function (event) {
        event.preventDefault();
        window.openCVModal();
      });
    }
  });
})();

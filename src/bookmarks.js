export const linkData = [
   
  ];
  
  const categoryList = document.getElementById("category-list");
  const linksGrid = document.getElementById("links-grid");
  const categoriesHeader = document.querySelector('.categories-header');

  export function renderCategories() {
    categoryList.innerHTML = "";
    linkData.forEach((category, index) => {
      const li = document.createElement("li");
      li.className = "category-item";
      if (index === 0) {
        li.classList.add("active");
      }
      li.dataset.index = index;
      li.innerHTML = `<img src="${category.icon}" alt="${category.category}" class="category-icon"> <span class="category-text">${category.category}</span>`;
      categoryList.appendChild(li);

      // Add event listeners for hover effect only if categoriesHeader has 'icons-only' class
      li.addEventListener("mouseover", () => {
        if (categoriesHeader.classList.contains('icons-only')) {
            li.querySelector('.category-text').style.display = 'inline';
            li.style.position = 'relative'; // Ensure positioning context for absolute child
            li.style.zIndex = '100'; // Bring hovered item to front
        }
      });
      li.addEventListener("mouseout", () => {
        if (categoriesHeader.classList.contains('icons-only')) {
            li.querySelector('.category-text').style.display = 'none';
            li.style.zIndex = 'auto'; // Reset z-index
        }
      });
    });
  }
  
  export function renderLinks(categoryIndex) {
    const category = linkData[categoryIndex];
    linksGrid.innerHTML = "";
    category.links.forEach((link) => {
      const a = document.createElement("a");
      a.href = link.url;
      a.className = "glass-link";
      a.target = "_blank"; // Open in new tab
      a.innerHTML = `
        <div class="icon-placeholder" style="background-color: ${link.color};">
            <img src="${link.icon}" alt="${link.name}" class="link-icon">
        </div>
        <span>${link.name}</span>
        <div class="link-hover-menu">
            <p><strong>${link.name}</strong></p>
            <p>${link.url}</p>
            <p>${link.description}</p>
        </div>
      `;
      linksGrid.appendChild(a);
    });
  }

  categoryList.addEventListener("click", (e) => {
    const categoryItem = e.target.closest(".category-item");
    if (categoryItem) {
      const previouslyActive = document.querySelector(".category-item.active");
      if (previouslyActive) {
        previouslyActive.classList.remove("active");
      }
      categoryItem.classList.add("active");
      renderLinks(categoryItem.dataset.index);
    }
  });

  function checkCategoryOverflow() {
    // Temporarily show text to measure full width
    const tempTextElements = categoryList.querySelectorAll('.category-text');
    tempTextElements.forEach(el => el.style.display = 'inline');

    const hasOverflow = categoryList.scrollWidth > categoryList.clientWidth;

    // Reset display for text elements
    tempTextElements.forEach(el => el.style.display = '');

    if (hasOverflow) {
      categoriesHeader.classList.add('icons-only');
    } else {
      categoriesHeader.classList.remove('icons-only');
    }
    // Re-render categories to apply correct hover listeners based on new state
    renderCategories();
  }


  window.addEventListener('resize', () => {
    checkCategoryOverflow();
    // Re-render links for active category after resize to ensure proper layout
    const activeCategoryItem = document.querySelector(".category-item.active");
    if (activeCategoryItem) {
      renderLinks(activeCategoryItem.dataset.index);
    }
  });
